import { contextBridge, ipcRenderer } from 'electron'
import type { ProxyMetadata } from '../shared/types'

const siloAPI = {
  // Games
  getGames: () => ipcRenderer.invoke('games:get'),
  createGame: (name: string, url: string) => ipcRenderer.invoke('games:create', name, url),
  renameGame: (id: string, name: string) => ipcRenderer.invoke('games:rename', id, name),
  deleteGame: (id: string) => ipcRenderer.invoke('games:delete', id),

  // Environments
  getEnvironments: (gameId: string) => ipcRenderer.invoke('envs:get', gameId),
  getAllEnvironments: () => ipcRenderer.invoke('envs:getAll'),
  createEnvironment: (gameId: string, name: string, proxy: string | null, accountHint?: string | null) =>
    ipcRenderer.invoke('envs:create', gameId, name, proxy, accountHint ?? null),
  renameEnvironment: (id: string, name: string) => ipcRenderer.invoke('envs:rename', id, name),
  setEnvironmentProxy: (id: string, proxy: string | null) =>
    ipcRenderer.invoke('envs:setProxy', id, proxy),
  setEnvironmentAccountHint: (id: string, hint: string | null) =>
    ipcRenderer.invoke('envs:setAccountHint', id, hint),
  deleteEnvironment: (id: string) => ipcRenderer.invoke('envs:delete', id),
  clearSession: (environmentId: string) => ipcRenderer.invoke('envs:clearSession', environmentId),
  attachEnvironment: (gameId: string, environmentId: string) =>
    ipcRenderer.invoke('envs:attach', gameId, environmentId),

  // Proxies
  loadProxies: (): Promise<ProxyMetadata[]> => ipcRenderer.invoke('proxies:load'),
  saveProxies: (proxies: ProxyMetadata[]) => ipcRenderer.invoke('proxies:save', proxies),
  addProxy: (proxy: { label: string; address: string; color: string }): Promise<ProxyMetadata> =>
    ipcRenderer.invoke('proxies:add', proxy),
  removeProxy: (id: string): Promise<void> => ipcRenderer.invoke('proxies:remove', id),

  // Smart Proxy
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: { smartProxyEnabled: boolean }) => ipcRenderer.invoke('settings:save', settings),
  setGameProxyMode: (gameId: string, mode: string) => ipcRenderer.invoke('games:setProxyMode', gameId, mode),
  getGameProxyMode: (gameId: string) => ipcRenderer.invoke('games:getProxyMode', gameId),

  // Browser views
  launchBrowser: (
    gameId: string,
    environmentId: string,
    bounds: { x: number; y: number; width: number; height: number }
  ) => ipcRenderer.invoke('browser:launch', gameId, environmentId, bounds),
  showBrowser: (
    gameId: string,
    environmentId: string,
    bounds: { x: number; y: number; width: number; height: number }
  ) => ipcRenderer.invoke('browser:show', gameId, environmentId, bounds),
  hideAllBrowsers: () => ipcRenderer.invoke('browser:hideAll'),
  closeBrowser: (gameId: string, environmentId: string) =>
    ipcRenderer.invoke('browser:close', gameId, environmentId),
  resizeBrowser: (
    gameId: string,
    environmentId: string,
    bounds: { x: number; y: number; width: number; height: number }
  ) => ipcRenderer.invoke('browser:resize', gameId, environmentId, bounds),
  getOpenBrowserIds: () => ipcRenderer.invoke('browser:openIds'),
  onBrowserStateChange: (cb: (event: { gameId: string; environmentId: string; state: string; reason?: string }) => void) => {
    const listener = (_: unknown, event: { gameId: string; environmentId: string; state: string; reason?: string }): void => cb(event)
    ipcRenderer.on('browser:stateChanged', listener)
    return () => ipcRenderer.removeListener('browser:stateChanged', listener)
  },

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
