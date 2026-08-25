import type { Game, Environment, Bounds } from '../shared/types'

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
        proxy: string | null
      ) => Promise<{ id: string; partition: string }>
      renameEnvironment: (id: string, name: string) => Promise<void>
      setEnvironmentProxy: (id: string, proxy: string | null) => Promise<void>
      deleteEnvironment: (id: string) => Promise<void>
      clearSession: (partition: string) => Promise<void>

      loadProxies: () => Promise<{ id: string; label: string; value: string; color: string }[]>
      saveProxies: (
        proxies: { id: string; label: string; value: string; color: string }[]
      ) => Promise<void>

      launchBrowser: (
        envId: string,
        partition: string,
        url: string,
        proxy: string | null,
        bounds: Bounds
      ) => Promise<void>
      showBrowser: (envId: string, bounds: Bounds) => Promise<void>
      hideAllBrowsers: () => Promise<void>
      closeBrowser: (envId: string) => Promise<void>
      resizeBrowser: (envId: string, bounds: Bounds) => Promise<void>
      getOpenBrowserIds: () => Promise<string[]>

      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      isMaximized: () => Promise<boolean>
      onMaximizeChange: (cb: (maximized: boolean) => void) => () => void

      getWindowSize: () => Promise<{ width: number; height: number }>
    }
  }
}
