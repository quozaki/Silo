import { ipcMain, session } from 'electron'
import { randomUUID } from 'crypto'
import { SiloError, toSafeError, registerSafeIpcHandler } from './errors'
import {
  getGames,
  createGame,
  renameGame,
  deleteGame,
  getEnvironments,
  getAllEnvironments,
  createEnvironment,
  attachEnvironmentToGame,
  renameEnvironment,
  setEnvironmentProxy,
  setEnvironmentAccountHint,
  getEnvironmentById,
  getEnvironmentPartition,
  deleteEnvironment,
  getGameById,
  getGameProxyMode,
  setGameProxyMode
} from './db'
import { addProxy, getProxyConfig, listProxyMetadata, removeProxy, replaceProxyMetadata } from './proxyStore'
import {
  browserSessions,
  closeSessionsForEnvironment,
  closeSessionsForGame,
  refreshBrowserSessionProxy,
  setEnvironmentDeletionPending,
  setGameDeletionPending
} from './views'
import {
  loadSmartProxySettings,
  saveSmartProxySettings,
  buildPacScript,
  clearProxyCredentials,
  resolveEffectiveMode,
  rememberProxyCredentialsForProxy
} from './smartProxy'

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STORAGE_TYPES = ['cookies', 'localstorage', 'indexdb', 'cachestorage', 'shadercache', 'serviceworkers'] as const
const deletingEnvironmentIds = new Set<string>()
const deletingGameIds = new Set<string>()

function registerSafe(channel: string, handler: (...args: never[]) => unknown): void {
  registerSafeIpcHandler(ipcMain, channel, handler, `Could not complete ${channel}.`)
}

function requireId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) throw new SiloError('INVALID_REQUEST', `Invalid ${label}.`)
  return value
}

function validateName(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new SiloError('INVALID_REQUEST', `Invalid ${label} name.`)
  }
  return value.trim()
}

function validateGameUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 2048) {
    throw new SiloError('INVALID_REQUEST', 'Invalid game URL.')
  }
  const input = value.trim()
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`
  try {
    const parsed = new URL(candidate)
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
      throw new Error('Unsupported game URL')
    }
    return parsed.toString()
  } catch {
    throw new SiloError('INVALID_REQUEST', 'Invalid game URL.')
  }
}

function validateProxyId(proxy: unknown): string | null {
  if (proxy === null) return null
  if (typeof proxy !== 'string' || !ID_PATTERN.test(proxy)) throw new SiloError('INVALID_REQUEST', 'Invalid proxy configuration.')
  return proxy
}

function validateAccountHint(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new SiloError('INVALID_REQUEST', 'Invalid account hint.')
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > 64) throw new SiloError('INVALID_REQUEST', 'Invalid account hint.')
  return trimmed
}

function assertEnvironmentAvailable(id: string): void {
  if (deletingEnvironmentIds.has(id)) throw new SiloError('INVALID_REQUEST', 'Environment deletion is in progress.')
}

async function clearEnvironmentStorage(partition: string): Promise<void> {
  await session.fromPartition(partition).clearStorageData({ storages: [...STORAGE_TYPES] })
}

export function registerIPC(): void {
  // Games
  registerSafe('games:get', () => getGames())

  registerSafe('games:create', (_, name: string, url: string) => {
    const safeName = validateName(name, 'game', 64)
    const normalizedUrl = validateGameUrl(url)
    const id = randomUUID()
    createGame(id, safeName, normalizedUrl)
    return id
  })

  registerSafe('games:rename', (_, id: string, name: string) => {
    renameGame(requireId(id, 'gameId'), validateName(name, 'game', 64))
  })

  registerSafe('games:delete', async (_, rawId: string) => {
    const id = requireId(rawId, 'gameId')
    if (deletingGameIds.has(id)) throw new SiloError('INVALID_REQUEST', 'Game deletion is already in progress.')
    if (!getGameById(id)) throw new SiloError('NOT_FOUND', 'Game not found.')
    deletingGameIds.add(id)
    setGameDeletionPending(id, true)
    try {
      // A game deletion only closes sessions for that game. Its environments
      // and partitions are independent records and are deliberately retained.
      await closeSessionsForGame(id)
      deleteGame(id)
    } finally {
      setGameDeletionPending(id, false)
      deletingGameIds.delete(id)
    }
  })

  // Environments and Game + Environment usage links
  registerSafe('envs:get', (_, rawGameId: string) => getEnvironments(requireId(rawGameId, 'gameId')))
  registerSafe('envs:getAll', () => getAllEnvironments())

  registerSafe('envs:create', (_, rawGameId: string, name: string, rawProxy: string | null, rawHint?: unknown) => {
    const gameId = requireId(rawGameId, 'gameId')
    const safeName = validateName(name, 'environment', 32)
    const proxy = validateProxyId(rawProxy)
    if (proxy && !getProxyConfig(proxy)) throw new SiloError('INVALID_REQUEST', 'Invalid proxy configuration.')
    const accountHint = validateAccountHint(rawHint ?? null)
    const id = randomUUID()
    // The renderer supplies only the initial usage game; the partition is
    // generated here from the new environment identity.
    const partition = `persist:silo-${id}`
    createEnvironment(id, gameId, safeName, partition, proxy, accountHint)
    return { id, partition }
  })

  registerSafe('envs:attach', (_, rawGameId: string, rawEnvironmentId: string) => {
    attachEnvironmentToGame(requireId(rawGameId, 'gameId'), requireId(rawEnvironmentId, 'environmentId'))
  })

  registerSafe('envs:rename', (_, rawId: string, name: string) => {
    const id = requireId(rawId, 'environmentId')
    assertEnvironmentAvailable(id)
    renameEnvironment(id, validateName(name, 'environment', 32))
  })

  registerSafe('envs:setAccountHint', (_, rawId: string, rawHint: unknown) => {
    const id = requireId(rawId, 'environmentId')
    assertEnvironmentAvailable(id)
    if (!getEnvironmentById(id)) throw new SiloError('NOT_FOUND', 'Environment not found.')
    const hint = validateAccountHint(rawHint)
    setEnvironmentAccountHint(id, hint)
  })

  registerSafe('envs:setProxy', async (_, rawId: string, rawProxy: string | null) => {
    const id = requireId(rawId, 'environmentId')
    assertEnvironmentAvailable(id)
    const proxy = validateProxyId(rawProxy)
    if (proxy && !getProxyConfig(proxy)) throw new SiloError('INVALID_REQUEST', 'Invalid proxy configuration.')
    if (!getEnvironmentById(id)) throw new SiloError('NOT_FOUND', 'Environment not found.')
    setEnvironmentProxy(id, proxy)
    await Promise.all(
      [...browserSessions.values()]
        .filter((record) => record.environmentId === id)
        .map((record) => refreshBrowserSessionProxy(record.gameId, record.environmentId))
    )
  })

  registerSafe('envs:delete', async (_, rawId: string) => {
    const id = requireId(rawId, 'environmentId')
    if (deletingEnvironmentIds.has(id)) throw new SiloError('INVALID_REQUEST', 'Environment deletion is already in progress.')
    const environment = getEnvironmentById(id)
    if (!environment) throw new SiloError('NOT_FOUND', 'Environment not found.')
    const partition = getEnvironmentPartition(id)
    if (!partition) throw new SiloError('INTERNAL_ERROR', 'Environment partition is unavailable.')
    deletingEnvironmentIds.add(id)
    setEnvironmentDeletionPending(id, true)
    try {
      // Metadata remains present until every runtime/storage step succeeds.
      await closeSessionsForEnvironment(id)
      await clearEnvironmentStorage(partition)
      await session.fromPartition(partition).setProxy({ mode: 'direct' })
      deleteEnvironment(id)
    } finally {
      setEnvironmentDeletionPending(id, false)
      deletingEnvironmentIds.delete(id)
    }
  })

  registerSafe('envs:clearSession', async (_, rawId: string) => {
    const id = requireId(rawId, 'environmentId')
    assertEnvironmentAvailable(id)
    if (!getEnvironmentById(id)) throw new SiloError('NOT_FOUND', 'Environment not found.')
    if ([...browserSessions.values()].some((record) => record.environmentId === id)) {
      throw new SiloError('INVALID_REQUEST', 'Close the environment before clearing its session.')
    }
    const partition = getEnvironmentPartition(id)
    if (!partition) throw new SiloError('INTERNAL_ERROR', 'Environment partition is unavailable.')
    await clearEnvironmentStorage(partition)
  })

  // Proxies
  registerSafe('proxies:load', () => {
    return listProxyMetadata()
  })

  registerSafe('proxies:save', (_, proxies: unknown) => {
    try {
      // Keep this channel as a safe metadata replacement for existing callers.
      // A legacy caller may still submit address-bearing entries; those values
      // are consumed in main and never returned to the renderer.
      if (Array.isArray(proxies) && proxies.every((entry) => typeof entry === 'object' && entry !== null && 'value' in (entry as object))) {
        for (const raw of proxies) {
          const value = raw as Record<string, unknown>
          addProxy({
            id: value.id as string,
            label: value.label as string,
            address: value.value as string,
            color: value.color as string
          })
        }
      } else {
        replaceProxyMetadata(proxies)
      }
    } catch (error) {
      throw toSafeError(error, 'Could not save proxy settings. Your change was not saved.')
    }
  })

  registerSafe('proxies:add', (_, rawProxy: unknown) => {
    if (typeof rawProxy !== 'object' || rawProxy === null || Array.isArray(rawProxy)) {
      throw new SiloError('INVALID_REQUEST', 'Invalid proxy configuration.')
    }
    const value = rawProxy as Record<string, unknown>
    try {
      return addProxy({
        label: value.label as string,
        address: value.address as string,
        color: value.color as string
      })
    } catch (error) {
      throw toSafeError(error, 'Could not save proxy settings. Your change was not saved.')
    }
  })

  registerSafe('proxies:remove', (_, rawId: unknown) => {
    const id = requireId(rawId, 'proxyId')
    if (getAllEnvironments().some((environment) => environment.proxy === id)) {
      throw new SiloError('INVALID_REQUEST', 'Proxy is assigned to an Environment.')
    }
    try {
      removeProxy(id)
    } catch (error) {
      throw toSafeError(error, 'Could not remove proxy settings.')
    }
  })

  // Smart proxy settings
  registerSafe('settings:load', () => {
    return loadSmartProxySettings()
  })

  registerSafe('settings:save', async (_, settings: unknown) => {
    if (typeof settings !== 'object' || settings === null) throw new SiloError('INVALID_REQUEST', 'Invalid settings.')
    const value = settings as Record<string, unknown>
    if (typeof value.smartProxyEnabled !== 'boolean') throw new SiloError('INVALID_REQUEST', 'Invalid settings.')
    saveSmartProxySettings({ smartProxyEnabled: value.smartProxyEnabled })
    await reapplyAllOpenProxies()
  })

  registerSafe('games:setProxyMode', async (_, rawGameId: string, mode: string) => {
    const gameId = requireId(rawGameId, 'gameId')
    if (!['inherit', 'smart', 'full'].includes(mode)) throw new SiloError('INVALID_REQUEST', 'Invalid proxy mode.')
    setGameProxyMode(gameId, mode)
    await reapplyAllOpenProxies(gameId)
  })

  registerSafe('games:getProxyMode', (_, rawGameId: string) => {
    const gameId = requireId(rawGameId, 'gameId')
    if (!getGameById(gameId)) throw new SiloError('NOT_FOUND', 'Game not found.')
    return getGameProxyMode(gameId) || 'inherit'
  })
}

async function reapplyAllOpenProxies(gameIdFilter?: string): Promise<void> {
  const settings = loadSmartProxySettings()
  for (const record of browserSessions.values()) {
    if (record.state !== 'RUNNING' || record.view.webContents.isDestroyed()) continue
    if (gameIdFilter && record.gameId !== gameIdFilter) continue
    const game = getGameById(record.gameId)
    const environment = getEnvironmentById(record.environmentId)
    if (!game || !environment) continue
    const proxyId = environment.proxy ?? null
    const ses = record.view.webContents.session
    if (!proxyId) {
      clearProxyCredentials(ses)
      await ses.setProxy({ mode: 'direct' })
      continue
    }
    const proxyConfig = getProxyConfig(proxyId)
    if (!proxyConfig) throw new SiloError('NOT_FOUND', 'Proxy configuration not found.')
    const proxy = proxyConfig.proxyRules
    clearProxyCredentials(ses)
    rememberProxyCredentialsForProxy(proxyId, proxy, proxyConfig.username ? {
      username: proxyConfig.username,
      password: proxyConfig.password || ''
    } : undefined, ses)
    const effective = resolveEffectiveMode(settings, game.proxy_mode as import('./smartProxy').GameProxyMode | null | undefined)
    if (effective === 'full') {
      await ses.setProxy({ proxyRules: proxy })
    } else {
      const pac = buildPacScript(proxy, game.url)
      if (!pac) await ses.setProxy({ proxyRules: proxy })
      else await ses.setProxy({ pacScript: `data:text/javascript,${encodeURIComponent(pac)}` })
    }
  }
}
