import { app, shell, BrowserWindow, ipcMain, WebContentsView, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../build/icon.png?asset'
import { initDB } from './db'
import { registerIPC } from './ipc'
import { openViews } from './views'

type ViewBounds = { x: number; y: number; width: number; height: number }

let mainWindow: BrowserWindow
let windowIpcRegistered = false

// ── Workspace geometry (must match renderer App.tsx constants) ────────────────
const SIDEBAR_WIDTH = 280 // fixed per design-system
const TITLEBAR_HEIGHT = 32
const TABBAR_HEIGHT = 40
const WORKSPACE_Y = TITLEBAR_HEIGHT + TABBAR_HEIGHT // 72

function getWorkspaceBounds(): ViewBounds {
  // TitleBar 32 + TabBar 40 + Sidebar 280  =>  {x:280, y:72, w:innerWidth-280, h:innerHeight-72}
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { x: SIDEBAR_WIDTH, y: WORKSPACE_Y, width: 1000, height: 600 }
  }
  const [w, h] = mainWindow.getContentSize()
  return { x: SIDEBAR_WIDTH, y: WORKSPACE_Y, width: w - SIDEBAR_WIDTH, height: h - WORKSPACE_Y }
}

function hideAllViews(): void {
  // Defensive: detach every child currently attached, not just those in the Map
  if (!mainWindow || mainWindow.isDestroyed()) return
  for (const child of [...mainWindow.contentView.children]) {
    try {
      mainWindow.contentView.removeChildView(child as WebContentsView)
    } catch {
      // already detached
    }
  }
}

function showView(envId: string, bounds?: ViewBounds): void {
  const view = openViews.get(envId)
  if (!view) return
  const b = bounds && bounds.x === SIDEBAR_WIDTH && bounds.y === WORKSPACE_Y ? bounds : getWorkspaceBounds()
  hideAllViews()
  mainWindow.contentView.addChildView(view)
  view.setBounds(b)
  // Paranoia: ensure no other view stayed attached (race)
  for (const child of [...mainWindow.contentView.children]) {
    if (child !== view) {
      try {
        mainWindow.contentView.removeChildView(child as WebContentsView)
      } catch {
        // ignore
      }
    }
  }
}

async function applyProxy(ses: Electron.Session, proxy: string | null): Promise<void> {
  try {
    if (proxy) {
      await ses.setProxy({ proxyRules: proxy })
    } else {
      // Persist partitions keep the last proxy; always reset when none is assigned
      await ses.setProxy({ mode: 'direct' })
    }
  } catch (err) {
    console.error('Failed to apply proxy:', err)
  }
}

const pendingLaunches = new Set<string>()

function registerWindowIpc(): void {
  if (windowIpcRegistered) return
  windowIpcRegistered = true

  ipcMain.handle(
    'browser:launch',
    async (
      _,
      envId: string,
      partition: string,
      url: string,
      proxy: string | null,
      bounds: ViewBounds
    ): Promise<void> => {
      if (typeof envId !== 'string' || !/^[0-9a-f-]{36}$/.test(envId)) return
      if (typeof partition !== 'string' || partition !== `persist:silo-${envId}`) return
      if (typeof url !== 'string' || !/^https?:\/\/.+/.test(url) || url.length > 2048) return
      if (proxy !== null && (typeof proxy !== 'string' || !/^(socks5|socks4|http):\/\/.+/i.test(proxy))) return
      if (!bounds || typeof bounds.x !== 'number' || typeof bounds.y !== 'number' || typeof bounds.width !== 'number' || typeof bounds.height !== 'number') return
      if (pendingLaunches.has(envId)) return
      if (openViews.has(envId)) {
        showView(envId, bounds)
        return
      }
      pendingLaunches.add(envId)
      try {
        // session.fromPartition('persist:silo-'+uuid) per env — isolated storage + proxy
        const ses = session.fromPartition(partition)
        await applyProxy(ses, proxy)

        // Re-check after async gap — another launch may have finished
        if (openViews.has(envId)) {
          showView(envId, bounds)
          return
        }

        const view = new WebContentsView({
          webPreferences: {
            session: ses,
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true
          }
        })

        // Avoid white flash: dark background until first paint
        try {
          ;(view as unknown as { setBackgroundColor?: (c: string) => void }).setBackgroundColor?.('#09090B')
        } catch {
          // ignore — View may not support setBackgroundColor on some Electron versions
        }
        try {
          ;(view.webContents as unknown as { setBackgroundColor?: (c: string) => void }).setBackgroundColor?.('#09090B')
        } catch {
          // ignore
        }

        hideAllViews()
        mainWindow.contentView.addChildView(view)
        // Defensive: always use computed workspace bounds (x:280 y:72 w:innerWidth-280 h:innerHeight-72)
        const targetBounds = getWorkspaceBounds()
        // Validate caller-provided bounds matches expected geometry — if not, use computed
        const useBounds =
          bounds.x === SIDEBAR_WIDTH &&
          bounds.y === WORKSPACE_Y &&
          bounds.width === targetBounds.width &&
          bounds.height === targetBounds.height
            ? bounds
            : targetBounds
        view.setBounds(useBounds)
        await view.webContents.loadURL(url)
        openViews.set(envId, view)
      } finally {
        pendingLaunches.delete(envId)
      }
    }
  )

  ipcMain.handle('browser:show', (_, envId: string, bounds: ViewBounds) => {
    if (typeof envId !== 'string' || !/^[0-9a-f-]{36}$/.test(envId)) return
    showView(envId, bounds)
  })

  ipcMain.handle('browser:hideAll', () => {
    hideAllViews()
  })

  ipcMain.handle('browser:close', (_, envId: string) => {
    if (typeof envId !== 'string' || !/^[0-9a-f-]{36}$/.test(envId)) return
    const view = openViews.get(envId)
    if (!view) return
    try {
      mainWindow.contentView.removeChildView(view)
    } catch {
      // View may already have been removed
    }
    try {
      view.webContents.close()
    } catch {
      // already closed
    }
    openViews.delete(envId)
  })

  ipcMain.handle('browser:resize', (_, envId: string, bounds: ViewBounds) => {
    if (typeof envId !== 'string' || !/^[0-9a-f-]{36}$/.test(envId)) return
    const view = openViews.get(envId)
    if (!view) return
    // Defensive: ignore stale/typo bounds, always set to computed workspace bounds on resize
    const computed = getWorkspaceBounds()
    const useBounds =
      bounds && typeof bounds.x === 'number' && bounds.x === SIDEBAR_WIDTH && bounds.y === WORKSPACE_Y
        ? bounds
        : computed
    // setBounds is the resize path — no detach needed, just update geometry
    view.setBounds(useBounds)
    // If the view is the active one but was detached (e.g. modal hide), re-attach defensively
    const isAttached = [...mainWindow.contentView.children].includes(view as unknown as typeof mainWindow.contentView.children[number])
    if (!isAttached) {
      // Only re-attach if this env is supposed to be visible — caller will showView next
      // Don't auto-attach here; just ensure bounds are fresh for next showView
    }
  })

  ipcMain.handle('browser:openIds', () => {
    return Array.from(openViews.keys())
  })

  ipcMain.handle('window:minimize', () => mainWindow.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow.close())
  ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized())
  ipcMain.handle('window:getSize', () => {
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
    // Prevent leaked views when window is recreated (e.g. macOS activate)
    for (const view of openViews.values()) {
      try {
        view.webContents.close()
      } catch {
        // ignore
      }
    }
    openViews.clear()
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
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.silo')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  await initDB()
  createWindow()
  registerIPC()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
