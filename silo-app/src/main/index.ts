import { app, shell, BrowserWindow, ipcMain, WebContentsView, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../build/icon.png?asset'
import { initDB } from './db'
import { registerIPC } from './ipc'

type ViewBounds = { x: number; y: number; width: number; height: number }

// Track open browser views: envId -> WebContentsView
const openViews = new Map<string, WebContentsView>()

let mainWindow: BrowserWindow
let windowIpcRegistered = false

function hideAllViews(): void {
  // Defensive: detach every child currently attached, not just those in the Map
  for (const child of [...mainWindow.contentView.children]) {
    try {
      mainWindow.contentView.removeChildView(child as WebContentsView)
    } catch {
      // already detached
    }
  }
}

function showView(envId: string, bounds: ViewBounds): void {
  const view = openViews.get(envId)
  if (!view) return
  hideAllViews()
  mainWindow.contentView.addChildView(view)
  view.setBounds(bounds)
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
      if (pendingLaunches.has(envId)) return
      if (openViews.has(envId)) {
        showView(envId, bounds)
        return
      }
      pendingLaunches.add(envId)
      try {
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
            nodeIntegration: false,
            contextIsolation: true
          }
        })

        hideAllViews()
        mainWindow.contentView.addChildView(view)
        view.setBounds(bounds)
        await view.webContents.loadURL(url)
        openViews.set(envId, view)
      } finally {
        pendingLaunches.delete(envId)
      }
    }
  )

  ipcMain.handle('browser:show', (_, envId: string, bounds: ViewBounds) => {
    showView(envId, bounds)
  })

  ipcMain.handle('browser:hideAll', () => {
    hideAllViews()
  })

  ipcMain.handle('browser:close', (_, envId: string) => {
    const view = openViews.get(envId)
    if (!view) return
    try {
      mainWindow.contentView.removeChildView(view)
    } catch {
      // View may already have been removed
    }
    view.webContents.close()
    openViews.delete(envId)
  })

  ipcMain.handle('browser:resize', (_, envId: string, bounds: ViewBounds) => {
    const view = openViews.get(envId)
    if (view) view.setBounds(bounds)
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
    backgroundColor: '#0e0e0e',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
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
    shell.openExternal(details.url)
    return { action: 'deny' }
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
