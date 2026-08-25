import { contextBridge, ipcRenderer } from 'electron'

const siloAPI = {
  // Games
  getGames: () => ipcRenderer.invoke('games:get'),
  createGame: (name: string, url: string) => ipcRenderer.invoke('games:create', name, url),
  renameGame: (id: string, name: string) => ipcRenderer.invoke('games:rename', id, name),
  deleteGame: (id: string) => ipcRenderer.invoke('games:delete', id),

  // Environments
  getEnvironments: (gameId: string) => ipcRenderer.invoke('envs:get', gameId),
  getAllEnvironments: () => ipcRenderer.invoke('envs:getAll'),
  createEnvironment: (gameId: string, name: string, proxy: string | null) =>
    ipcRenderer.invoke('envs:create', gameId, name, proxy),
  renameEnvironment: (id: string, name: string) => ipcRenderer.invoke('envs:rename', id, name),
  setEnvironmentProxy: (id: string, proxy: string | null) =>
    ipcRenderer.invoke('envs:setProxy', id, proxy),
  deleteEnvironment: (id: string) => ipcRenderer.invoke('envs:delete', id),
  clearSession: (partition: string) => ipcRenderer.invoke('envs:clearSession', partition),

  // Proxies
  loadProxies: () => ipcRenderer.invoke('proxies:load'),
  saveProxies: (proxies: { id: string; label: string; value: string; color: string }[]) =>
    ipcRenderer.invoke('proxies:save', proxies),

  // Browser views
  launchBrowser: (
    envId: string,
    partition: string,
    url: string,
    proxy: string | null,
    bounds: { x: number; y: number; width: number; height: number }
  ) => ipcRenderer.invoke('browser:launch', envId, partition, url, proxy, bounds),
  showBrowser: (envId: string, bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke('browser:show', envId, bounds),
  hideAllBrowsers: () => ipcRenderer.invoke('browser:hideAll'),
  closeBrowser: (envId: string) => ipcRenderer.invoke('browser:close', envId),
  resizeBrowser: (envId: string, bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke('browser:resize', envId, bounds),
  getOpenBrowserIds: () => ipcRenderer.invoke('browser:openIds'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizeChange: (cb: (maximized: boolean) => void) => {
    const listener = (_: unknown, val: boolean): void => cb(val)
    ipcRenderer.on('window:maximizeChange', listener)
    return () => ipcRenderer.removeListener('window:maximizeChange', listener)
  },

  getWindowSize: () => ipcRenderer.invoke('window:getSize')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('silo', siloAPI)
  } catch (e) {
    console.error(e)
  }
} else {
  // @ts-ignore -- fallback when contextIsolation is disabled
  window.silo = siloAPI
}
