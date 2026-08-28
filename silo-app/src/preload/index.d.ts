import type { Game, Environment, Bounds, ProxyMetadata } from '../shared/types'

export type { Game, Environment, Bounds }

declare global {
  interface Window {
    silo: {
      getGames: () => Promise<Game[]>
      createGame: (name: string, url: string) => Promise<string>
      renameGame: (id: string, name: string) => Promise<void>
      deleteGame: (id: string) => Promise<void>

      getEnvironments: (gameId: string) => Promise<Environment[]>
      getAllEnvironments: () => Promise<Environment[]>
      createEnvironment: (
        gameId: string,
        name: string,
        proxy: string | null,
        accountHint?: string | null
      ) => Promise<{ id: string; partition: string }>
      renameEnvironment: (id: string, name: string) => Promise<void>
      setEnvironmentProxy: (id: string, proxy: string | null) => Promise<void>
      setEnvironmentAccountHint: (id: string, hint: string | null) => Promise<void>
      deleteEnvironment: (id: string) => Promise<void>
      clearSession: (environmentId: string) => Promise<void>
      attachEnvironment: (gameId: string, environmentId: string) => Promise<void>

      loadProxies: () => Promise<ProxyMetadata[]>
      saveProxies: (proxies: ProxyMetadata[]) => Promise<void>
      addProxy: (proxy: { label: string; address: string; color: string }) => Promise<ProxyMetadata>
      removeProxy: (id: string) => Promise<void>

      loadSettings: () => Promise<{ smartProxyEnabled: boolean }>
      saveSettings: (settings: { smartProxyEnabled: boolean }) => Promise<void>
      setGameProxyMode: (gameId: string, mode: string) => Promise<void>
      getGameProxyMode: (gameId: string) => Promise<string>

      launchBrowser: (
        gameId: string,
        environmentId: string,
        bounds: Bounds
      ) => Promise<void>
      showBrowser: (gameId: string, environmentId: string, bounds: Bounds) => Promise<void>
      hideAllBrowsers: () => Promise<void>
      closeBrowser: (gameId: string, environmentId: string) => Promise<void>
      resizeBrowser: (gameId: string, environmentId: string, bounds: Bounds) => Promise<void>
      getOpenBrowserIds: () => Promise<string[]>
      onBrowserStateChange: (
        cb: (event: { gameId: string; environmentId: string; state: string; reason?: string }) => void
      ) => () => void

      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      isMaximized: () => Promise<boolean>
      onMaximizeChange: (cb: (maximized: boolean) => void) => () => void

      getWindowSize: () => Promise<{ width: number; height: number }>
    }
  }
}
