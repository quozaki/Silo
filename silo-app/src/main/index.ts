import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../build/icon.png?asset'
import { initDB } from './db'
import { getEnvironmentById, getGameById, setLegacyProxyMigrator } from './db'
import { registerIPC } from './ipc'
import { initializeProxyStore, proxyIdForLegacyAddress } from './proxyStore'
import {
  setBrowserWindow,
  launchBrowserSession,
  showBrowserSession,
  hideAllBrowserSessions,
  closeBrowserSession,
  resizeBrowserSession,
  getOpenBrowserIds,
  shutdownBrowserSessions,
  type ViewBounds
} from './views'
import { getProxyCredentials } from './smartProxy'
import { SiloError, logInternalError, toSafeError, registerSafeIpcHandler } from './errors'

// These module exports keep the main-process boundaries directly testable;
// production behavior remains driven by the app startup below.
export {
  initDB, createGame, createEnvironment, getGames, getEnvironments, getAllEnvironments,
  getGameById, getEnvironmentById, getEnvironments as getEnvironmentsForTest, partitionForEnvironment, persist,
  renameGame, deleteGame, renameEnvironment, deleteEnvironment, attachEnvironmentToGame, getEnvironmentPartition,
  setEnvironmentAccountHint, getEnvironmentAccountHint,
  setGameProxyMode, getGameProxyMode, getAllEnvironments as getAllEnvironmentsAlias
} from './db'
export { atomicWriteFile } from './storage'
export { saveSmartProxySettings, loadSmartProxySettings, rememberProxyCredentials, rememberProxyCredentialsForProxy, getProxyCredentials, clearProxyCredentials, clearAllProxyCredentials, getBaseDomain, getGameHost, buildPacScript, parseProxy, resolveEffectiveMode, proxyCredentials } from './smartProxy'
export { initializeProxyStore, listProxyMetadata, getProxyConfig, addProxy, removeProxy, resetProxyStoreForTests } from './proxyStore'
export { setBrowserWindow, launchBrowserSession, closeBrowserSession, getOpenBrowserIds, browserSessions, openViews, showBrowserSession, hideAllBrowserSessions, resizeBrowserSession, closeSessionsForEnvironment, closeSessionsForGame, shutdownBrowserSessions } from './views'

let mainWindow: BrowserWindow
let windowIpcRegistered = false
let shutdownStarted = false

// ── Workspace geometry (must match renderer App.tsx constants) ────────────────
const SIDEBAR_WIDTH = 280 // fixed per design-system
const TITLEBAR_HEIGHT = 32
const TABBAR_HEIGHT = 40
const WORKSPACE_Y = TITLEBAR_HEIGHT + TABBAR_HEIGHT // 72
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function registerSafe(channel: string, handler: (...args: never[]) => unknown): void {
  registerSafeIpcHandler(ipcMain, channel, handler, `Could not complete ${channel}.`)
}

function getWorkspaceBounds(): ViewBounds {
  // TitleBar 32 + TabBar 40 + Sidebar 280  =>  {x:280, y:72, w:innerWidth-280, h:innerHeight-72}
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { x: SIDEBAR_WIDTH, y: WORKSPACE_Y, width: 1000, height: 600 }
  }
  const [w, h] = mainWindow.getContentSize()
  return { x: SIDEBAR_WIDTH, y: WORKSPACE_Y, width: w - SIDEBAR_WIDTH, height: h - WORKSPACE_Y }
}

function requireBrowserResourceIds(gameId: unknown, environmentId: unknown): { gameId: string; environmentId: string } {
  if (typeof gameId !== 'string' || !ID_PATTERN.test(gameId)) throw new SiloError('INVALID_REQUEST', 'Invalid gameId.')
  if (typeof environmentId !== 'string' || !ID_PATTERN.test(environmentId)) throw new SiloError('INVALID_REQUEST', 'Invalid environmentId.')
  if (!getGameById(gameId)) throw new SiloError('NOT_FOUND', 'Game not found.')
  if (!getEnvironmentById(environmentId)) throw new SiloError('NOT_FOUND', 'Environment not found.')
  return { gameId, environmentId }
}

function validateBounds(bounds: unknown): asserts bounds is ViewBounds {
  if (!bounds || typeof bounds !== 'object') throw new SiloError('INVALID_REQUEST', 'Invalid browser bounds.')
  const value = bounds as Record<string, unknown>
  if (!['x', 'y', 'width', 'height'].every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))) {
    throw new SiloError('INVALID_REQUEST', 'Invalid browser bounds.')
  }
  if ((value.width as number) <= 0 || (value.height as number) <= 0 || (value.width as number) > 10000 || (value.height as number) > 10000) {
    throw new SiloError('INVALID_REQUEST', 'Invalid browser bounds.')
  }
}

function registerProxyAuthHandler(): void {
  // Handle PAC proxy auth (credentials stripped from PAC, supplied via login event)
  // Using app 'login' covers all sessions. Also register per-session fallback.
  const handleLogin = (
    event: Electron.Event,
    _webContents: Electron.WebContents,
    _details: Electron.Details,
    authInfo: Electron.AuthInfo,
    callback: (username: string, password: string) => void
  ): void => {
    if (!authInfo.isProxy) return
    const creds = getProxyCredentials(_webContents.session, authInfo.host, String(authInfo.port))
    event.preventDefault()
    if (creds) {
      callback(creds.username, creds.password)
    }
  }
  // Remove existing to avoid duplicates on reload (dev HMR)
  app.removeAllListeners('login')
  app.on('login', handleLogin as unknown as (...args: unknown[]) => void)
}

function registerWindowIpc(): void {
  if (windowIpcRegistered) return
  windowIpcRegistered = true

  registerSafe(
    'browser:launch',
    async (_, rawGameId: unknown, rawEnvironmentId: unknown, rawBounds: unknown): Promise<void> => {
      const { gameId, environmentId } = requireBrowserResourceIds(rawGameId, rawEnvironmentId)
      validateBounds(rawBounds)
      const bounds = rawBounds
      const target = getWorkspaceBounds()
      const safeBounds =
        bounds.x === SIDEBAR_WIDTH && bounds.y === WORKSPACE_Y && bounds.width === target.width && bounds.height === target.height
          ? bounds
          : target
      try {
        await launchBrowserSession(gameId, environmentId, safeBounds)
      } catch (error) {
        throw toSafeError(error, 'Could not launch the game session.')
      }
    }
  )

  registerSafe('browser:show', (_, rawGameId: unknown, rawEnvironmentId: unknown, rawBounds: unknown) => {
    const { gameId, environmentId } = requireBrowserResourceIds(rawGameId, rawEnvironmentId)
    validateBounds(rawBounds)
    showBrowserSession(gameId, environmentId, getWorkspaceBounds())
  })

  registerSafe('browser:hideAll', () => {
    hideAllBrowserSessions()
  })

  registerSafe('browser:close', (_, rawGameId: unknown, rawEnvironmentId: unknown) => {
    const { gameId, environmentId } = requireBrowserResourceIds(rawGameId, rawEnvironmentId)
    return closeBrowserSession(gameId, environmentId).catch((error) => {
      throw toSafeError(error, 'Could not close the game session.')
    })
  })

  registerSafe('browser:resize', (_, rawGameId: unknown, rawEnvironmentId: unknown, rawBounds: unknown) => {
    const { gameId, environmentId } = requireBrowserResourceIds(rawGameId, rawEnvironmentId)
    validateBounds(rawBounds)
    resizeBrowserSession(gameId, environmentId, getWorkspaceBounds())
  })

  registerSafe('browser:openIds', () => {
    return getOpenBrowserIds()
  })

  registerSafe('window:minimize', () => mainWindow.minimize())
  registerSafe('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  registerSafe('window:close', () => mainWindow.close())
  registerSafe('window:isMaximized', () => mainWindow.isMaximized())
  registerSafe('window:getSize', () => {
    const [width, height] = mainWindow.getContentSize()
    return { width, height }
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    backgroundColor: '#09090B',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    void shutdownBrowserSessions()
    setBrowserWindow(null)
  })

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximizeChange', true))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximizeChange', false))

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const u = new URL(details.url)
      if (u.protocol === 'http:' || u.protocol === 'https:') shell.openExternal(details.url)
    } catch {
      // ignore invalid URL
    }
    return { action: 'deny' }
  })

  // Never allow main window to navigate away (file:// SPA only)
  mainWindow.webContents.on('will-navigate', (e) => {
    e.preventDefault()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  registerWindowIpc()
  setBrowserWindow(mainWindow)
}

function registerShutdownHandling(): void {
  app.on('before-quit', (event) => {
    if (shutdownStarted) return
    event.preventDefault()
    shutdownStarted = true
    void shutdownBrowserSessions()
      .catch((error) => {
        logInternalError('Silo browser shutdown encountered an error:', error)
      })
      .finally(() => {
        app.quit()
      })
  })
}

export const appStartup = app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.silo')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerProxyAuthHandler()
  initializeProxyStore()
  setLegacyProxyMigrator(proxyIdForLegacyAddress)
  await initDB()
  createWindow()
  registerShutdownHandling()
  registerIPC()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((error) => {
  logInternalError('Silo failed to start:', error)
  app.quit()
  throw error
})
void appStartup.catch(() => undefined)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
