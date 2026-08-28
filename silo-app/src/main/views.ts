import { BrowserWindow, WebContentsView, session, shell } from 'electron'
import {
  getEnvironmentById,
  getGameById,
  partitionForEnvironment,
  type EnvironmentRecord,
  type GameRecord
} from './db'
import {
  buildPacScript,
  clearAllProxyCredentials,
  clearProxyCredentials,
  loadSmartProxySettings,
  rememberProxyCredentialsForProxy,
  resolveEffectiveMode
} from './smartProxy'
import { getProxyConfig } from './proxyStore'
import { SiloError } from './errors'

export type ViewBounds = { x: number; y: number; width: number; height: number }
export type BrowserSessionState = 'LAUNCHING' | 'RUNNING' | 'CLOSING' | 'CLOSED' | 'FAILED' | 'CRASHED'

export interface BrowserSessionRecord {
  id: string
  gameId: string
  environmentId: string
  partition: string
  state: BrowserSessionState
  view: WebContentsView
}

// A session is Game + Environment. Multiple records may use one environment's
// partition, while the environment itself remains a single persistent identity.
export const browserSessions = new Map<string, BrowserSessionRecord>()
export const openViews = new Map<string, WebContentsView>()

const pendingLaunches = new Map<string, Promise<void>>()
const operationQueues = new Map<string, Promise<void>>()
const blockedEnvironmentIds = new Set<string>()
const blockedGameIds = new Set<string>()
let browserWindow: BrowserWindow | null = null
let shuttingDown = false
let shutdownPromise: Promise<void> | null = null

export function browserSessionId(gameId: string, environmentId: string): string {
  return `${gameId}:${environmentId}`
}

function environmentOperationKey(environmentId: string): string {
  return `environment:${environmentId}`
}

export function setBrowserWindow(window: BrowserWindow | null): void {
  browserWindow = window
}

export function setEnvironmentDeletionPending(environmentId: string, pending: boolean): void {
  if (pending) blockedEnvironmentIds.add(environmentId)
  else blockedEnvironmentIds.delete(environmentId)
}

export function setGameDeletionPending(gameId: string, pending: boolean): void {
  if (pending) blockedGameIds.add(gameId)
  else blockedGameIds.delete(gameId)
}

function queueOperation<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = operationQueues.get(key) ?? Promise.resolve()
  const current = previous.catch(() => undefined).then(operation)
  const settled = current.then(() => undefined, () => undefined)
  operationQueues.set(key, settled)
  void settled.then(() => {
    if (operationQueues.get(key) === settled) operationQueues.delete(key)
  })
  return current
}

function requireAuthoritativeRecords(gameId: string, environmentId: string): { game: GameRecord; environment: EnvironmentRecord; partition: string } {
  const game = getGameById(gameId)
  if (!game) throw new SiloError('NOT_FOUND', 'Game not found.')
  const environment = getEnvironmentById(environmentId)
  if (!environment) throw new SiloError('NOT_FOUND', 'Environment not found.')
  const partition = partitionForEnvironment(environment.id)
  if (environment.partition !== partition) throw new Error('Environment partition identity is invalid')
  return { game, environment, partition }
}

async function applyAuthoritativeProxy(
  ses: Electron.Session,
  environment: EnvironmentRecord,
  game: GameRecord
): Promise<void> {
  clearProxyCredentials(ses)
  try {
    const proxyId = environment.proxy ?? null
    if (!proxyId) {
      await ses.setProxy({ mode: 'direct' })
      return
    }
    const proxyConfig = getProxyConfig(proxyId)
    if (!proxyConfig) throw new SiloError('NOT_FOUND', 'Proxy configuration not found.')
    const proxy = proxyConfig.proxyRules
    rememberProxyCredentialsForProxy(proxyId, proxy, proxyConfig.username ? {
      username: proxyConfig.username,
      password: proxyConfig.password || ''
    } : undefined, ses)
    const mode = resolveEffectiveMode(
      loadSmartProxySettings(),
      game.proxy_mode as import('./smartProxy').GameProxyMode | null | undefined
    )
    if (mode === 'full') {
      await ses.setProxy({ proxyRules: proxy })
      return
    }
    const pac = buildPacScript(proxy, game.url)
    if (!pac) await ses.setProxy({ proxyRules: proxy })
    else await ses.setProxy({ pacScript: `data:text/javascript,${encodeURIComponent(pac)}` })
  } catch (error) {
    clearProxyCredentials(ses)
    throw error
  }
}

function detachView(view: WebContentsView): void {
  if (!browserWindow || browserWindow.isDestroyed()) return
  try {
    browserWindow.contentView.removeChildView(view)
  } catch {
    // It may already be detached.
  }
}

function isSafeGameUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname)
  } catch {
    return false
  }
}

function notifyBrowserState(record: BrowserSessionRecord, reason?: string): void {
  if (!browserWindow || browserWindow.isDestroyed()) return
  browserWindow.webContents.send('browser:stateChanged', {
    gameId: record.gameId,
    environmentId: record.environmentId,
    state: record.state,
    ...(reason ? { reason } : {})
  })
}

function invalidateRecord(record: BrowserSessionRecord, state: 'FAILED' | 'CRASHED', reason?: string): void {
  if (record.state === 'CLOSED' || record.state === 'CLOSING') return
  const recordSession = getViewWebContents(record.view)?.session
  record.state = state
  detachView(record.view)
  if (browserSessions.get(record.id) === record) browserSessions.delete(record.id)
  if (openViews.get(record.id) === record.view) openViews.delete(record.id)
  if (recordSession && ![...browserSessions.values()].some((other) => other.partition === record.partition)) {
    clearProxyCredentials(recordSession)
  }
  notifyBrowserState(record, reason)
}

function configureGameNavigation(record: BrowserSessionRecord): void {
  const webContents = record.view.webContents
  webContents.setWindowOpenHandler((details) => {
    // Game popups must never create an uncontrolled Electron window. A normal
    // web URL may still be opened by the user's default browser.
    if (isSafeGameUrl(details.url)) void shell.openExternal(details.url)
    notifyBrowserState(record, 'Popup blocked')
    return { action: 'deny' }
  })
  webContents.on('will-navigate', (event, url) => {
    if (!isSafeGameUrl(url)) {
      event.preventDefault()
      notifyBrowserState(record, 'Navigation blocked')
    }
  })
  webContents.on('will-redirect', (event, url) => {
    if (!isSafeGameUrl(url)) {
      event.preventDefault()
      notifyBrowserState(record, 'Redirect blocked')
    }
  })
}

function getViewWebContents(view: WebContentsView): Electron.WebContents | null {
  return (view as unknown as { webContents?: Electron.WebContents }).webContents ?? null
}

function requestWebContentsClose(webContents: Electron.WebContents): void {
  if (webContents.isDestroyed()) return
  try {
    // Do not allow an embedded page's beforeunload handler to keep a Silo tab
    // alive indefinitely.
    webContents.close({ waitForBeforeUnload: false })
  } catch {
    // Fall through to the guarded runtime fallback below.
  }
  if (!webContents.isDestroyed()) {
    const destroyable = webContents as unknown as { destroy?: () => void }
    destroyable.destroy?.()
  }
}

async function waitForDestroyed(webContents: Electron.WebContents): Promise<void> {
  if (webContents.isDestroyed()) return
  await new Promise<void>((resolve) => {
    let done = false
    const finish = (): void => {
      if (done) return
      done = true
      clearTimeout(timeout)
      resolve()
    }
    const timeout = setTimeout(finish, 5000)
    webContents.once('destroyed', finish)
    if (webContents.isDestroyed()) finish()
  })
  if (!webContents.isDestroyed()) throw new Error('Browser session did not close')
}

async function closeRecord(record: BrowserSessionRecord): Promise<void> {
  if (record.state === 'CLOSED') return
  record.state = 'CLOSING'
  const webContents = getViewWebContents(record.view)
  const recordSession = webContents?.session
  detachView(record.view)
  try {
    if (webContents) {
      requestWebContentsClose(webContents)
      await waitForDestroyed(webContents)
    }
    record.state = 'CLOSED'
    browserSessions.delete(record.id)
    openViews.delete(record.id)
    if (recordSession && ![...browserSessions.values()].some((other) => other.partition === record.partition)) {
      clearProxyCredentials(recordSession)
    }
  } catch (error) {
    // Keep the record tracked when Chromium did not actually close. This lets
    // deletion fail safely and gives a later retry a live handle to recover.
    record.state = 'CLOSING'
    throw error
  }
}

export async function launchBrowserSession(gameId: string, environmentId: string, bounds: ViewBounds): Promise<void> {
  if (shuttingDown) throw new SiloError('BROWSER_FAILED', 'Silo is shutting down.')
  if (blockedEnvironmentIds.has(environmentId)) throw new SiloError('INVALID_REQUEST', 'Environment deletion is in progress.')
  if (blockedGameIds.has(gameId)) throw new SiloError('INVALID_REQUEST', 'Game deletion is in progress.')
  const id = browserSessionId(gameId, environmentId)
  const existingPending = pendingLaunches.get(id)
  if (existingPending) return existingPending
  const existing = browserSessions.get(id)
  if (existing?.state === 'RUNNING') {
    showBrowserSession(gameId, environmentId, bounds)
    return
  }

  const launch = queueOperation(environmentOperationKey(environmentId), async () => {
    if (shuttingDown) throw new SiloError('BROWSER_FAILED', 'Silo is shutting down.')
    const authoritative = requireAuthoritativeRecords(gameId, environmentId)
    const alreadyRunning = browserSessions.get(id)
    if (alreadyRunning?.state === 'RUNNING') {
      showBrowserSession(gameId, environmentId, bounds)
      return
    }
    const staleRecord = browserSessions.get(id)
    if (staleRecord) await closeRecord(staleRecord)

    const ses = session.fromPartition(authoritative.partition)
    await applyAuthoritativeProxy(ses, authoritative.environment, authoritative.game)
    if (shuttingDown) {
      clearProxyCredentials(ses)
      throw new SiloError('BROWSER_FAILED', 'Silo is shutting down.')
    }
    let view: WebContentsView
    try {
      view = new WebContentsView({
        webPreferences: {
          session: ses,
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          webSecurity: true
        }
      })
    } catch (error) {
      clearProxyCredentials(ses)
      throw error
    }
    const record: BrowserSessionRecord = {
      id,
      gameId,
      environmentId,
      partition: authoritative.partition,
      state: 'LAUNCHING',
      view
    }

    // Register before attach/load so every created view is represented.
    browserSessions.set(id, record)
    openViews.set(id, view)
    configureGameNavigation(record)
    view.webContents.on('render-process-gone', (_event, details) => {
      invalidateRecord(record, 'CRASHED', details.reason)
    })
    view.webContents.on('destroyed', () => {
      if (record.state !== 'CLOSING' && record.state !== 'CLOSED') invalidateRecord(record, 'CRASHED', 'Web contents destroyed')
    })
    view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
      if (isMainFrame && errorCode !== -3) invalidateRecord(record, 'FAILED', errorDescription)
    })
    try {
      if (!browserWindow || browserWindow.isDestroyed()) throw new Error('Browser window is unavailable')
      browserWindow.contentView.addChildView(view)
      view.setBounds(bounds)
      await view.webContents.loadURL(authoritative.game.url)
      if (browserSessions.get(id) !== record || record.state !== 'LAUNCHING') {
        throw new SiloError('BROWSER_FAILED', 'The game session failed while it was launching.')
      }
      record.state = 'RUNNING'
      notifyBrowserState(record)
    } catch (error) {
      record.state = 'FAILED'
      const webContents = getViewWebContents(view)
      detachView(view)
      try {
        if (webContents) {
          requestWebContentsClose(webContents)
          await waitForDestroyed(webContents)
        }
      } catch (cleanupError) {
        record.state = 'FAILED'
        throw new Error(`${error instanceof Error ? error.message : String(error)}; cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`)
      }
      if (browserSessions.get(id) === record) browserSessions.delete(id)
      if (openViews.get(id) === view) openViews.delete(id)
      throw error
    }
  })
  pendingLaunches.set(id, launch)
  try {
    await launch
  } finally {
    if (pendingLaunches.get(id) === launch) pendingLaunches.delete(id)
  }
}

export function showBrowserSession(gameId: string, environmentId: string, bounds: ViewBounds): void {
  const record = browserSessions.get(browserSessionId(gameId, environmentId))
  if (!record || record.state !== 'RUNNING') return
  if (!browserWindow || browserWindow.isDestroyed()) return
  if (record.view.webContents.isDestroyed()) {
    invalidateRecord(record, 'CRASHED', 'Web contents destroyed')
    return
  }
  for (const child of [...browserWindow.contentView.children]) {
    try {
      browserWindow.contentView.removeChildView(child as WebContentsView)
    } catch {
      // already detached
    }
  }
  browserWindow.contentView.addChildView(record.view)
  record.view.setBounds(bounds)
}

export function hideAllBrowserSessions(): void {
  if (!browserWindow || browserWindow.isDestroyed()) return
  for (const child of [...browserWindow.contentView.children]) {
    try {
      browserWindow.contentView.removeChildView(child as WebContentsView)
    } catch {
      // already detached
    }
  }
}

export function resizeBrowserSession(gameId: string, environmentId: string, bounds: ViewBounds): void {
  const record = browserSessions.get(browserSessionId(gameId, environmentId))
  if (record?.state === 'RUNNING') record.view.setBounds(bounds)
}

export async function closeBrowserSession(gameId: string, environmentId: string): Promise<void> {
  const id = browserSessionId(gameId, environmentId)
  return queueOperation(environmentOperationKey(environmentId), async () => {
    const record = browserSessions.get(id)
    if (record) await closeRecord(record)
  })
}

async function closeMatchingSessions(predicate: (record: Pick<BrowserSessionRecord, 'gameId' | 'environmentId'>) => boolean): Promise<void> {
  const ids = [...browserSessions.values()].filter(predicate).map((record) => record.id)
  const pendingIds = [...pendingLaunches.keys()].filter((id) => {
    if (ids.includes(id)) return false
    const [gameId, environmentId] = id.split(':')
    return predicate({ gameId, environmentId })
  })
  await Promise.all([...new Set([...ids, ...pendingIds])].map(async (id) => {
    const [gameId, environmentId] = id.split(':')
    const record = browserSessions.get(id)
    if (!record || predicate(record)) await closeBrowserSession(gameId, environmentId)
  }))
  const remaining = [...browserSessions.values()].filter(predicate)
  if (remaining.length > 0) throw new Error('One or more browser sessions did not close')
}

export function closeSessionsForEnvironment(environmentId: string): Promise<void> {
  return closeMatchingSessions((record) => record.environmentId === environmentId)
}

export function closeSessionsForGame(gameId: string): Promise<void> {
  return closeMatchingSessions((record) => record.gameId === gameId)
}

export function getOpenBrowserIds(): string[] {
  return [...browserSessions.values()]
    .filter((record) => record.state === 'RUNNING')
    .map((record) => record.id)
}

export async function shutdownBrowserSessions(): Promise<void> {
  if (shutdownPromise) return shutdownPromise
  shuttingDown = true
  shutdownPromise = (async () => {
    const records = [...browserSessions.values()]
    await Promise.allSettled(records.map((record) => closeRecord(record)))
    await Promise.allSettled([...pendingLaunches.values()])
    browserSessions.clear()
    openViews.clear()
    pendingLaunches.clear()
    operationQueues.clear()
    clearAllProxyCredentials()
  })()
  return shutdownPromise
}

export async function refreshBrowserSessionProxy(gameId: string, environmentId: string): Promise<void> {
  const record = browserSessions.get(browserSessionId(gameId, environmentId))
  if (!record || record.state !== 'RUNNING') return
  const authoritative = requireAuthoritativeRecords(gameId, environmentId)
  await applyAuthoritativeProxy(session.fromPartition(authoritative.partition), authoritative.environment, authoritative.game)
}

// Kept as a narrow cleanup utility for callers that only have a partition.
// Normal deletion uses closeSessionsForEnvironment so it can await completion.
export async function removeViewForPartition(partition: string | null): Promise<void> {
  if (!partition) return
  const records = [...browserSessions.values()].filter((record) => record.partition === partition)
  await Promise.all(records.map((record) => closeBrowserSession(record.gameId, record.environmentId)))
}

export async function removeViewsForPartitions(partitions: string[]): Promise<void> {
  await Promise.all(partitions.map((partition) => removeViewForPartition(partition)))
}
