import { useState, useEffect, useCallback, useMemo, type JSX } from 'react'
import Sidebar from './components/Sidebar'
import TabBar from './components/TabBar'
import Workspace from './components/Workspace'
import TitleBar from './components/TitleBar'
import { AddGameModal, AddEnvModal } from './components/Modals'
import Settings, { ProxyEntry } from './components/Settings'
import type { Game, Environment } from '../../shared/types'
import siloIcon from './assets/icon.png'

interface OpenTab {
  env: Environment
  game: Game
}

type Modal =
  | { type: 'addGame' }
  | { type: 'addEnv'; gameId: string; gameName: string }
  | { type: 'settings' }
  | null

const SIDEBAR_WIDTH = 224
const TITLEBAR_HEIGHT = 32
const TAB_BAR_HEIGHT = 38

export default function App(): JSX.Element {
  const [games, setGames] = useState<Game[]>([])
  const [environments, setEnvironments] = useState<Record<string, Environment[]>>({})
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [proxies, setProxies] = useState<ProxyEntry[]>([])

  // proxyColorMap: envId -> color (derived from proxy assignments, not state)
  const proxyColorMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const envs of Object.values(environments)) {
      for (const env of envs) {
        if (env.proxy) {
          const match = proxies.find((p) => p.value === env.proxy)
          if (match) map[env.id] = match.color
        }
      }
    }
    return map
  }, [environments, proxies])

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadGames = useCallback(async (): Promise<void> => {
    const g = await window.silo.getGames()
    setGames(g)
    const envMap: Record<string, Environment[]> = {}
    for (const game of g) {
      const envs = await window.silo.getEnvironments(game.id)
      envMap[game.id] = envs
    }
    setEnvironments(envMap)
  }, [])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void loadGames()
    void window.silo
      .loadProxies()
      .then(setProxies)
      .catch(() => {})
  }, [loadGames])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Proxy management ───────────────────────────────────────────────────────
  const handleProxiesChange = useCallback((updated: ProxyEntry[]) => {
    setProxies(updated)
    void window.silo.saveProxies(updated)
  }, [])

  // Auto-assign next available proxy
  const getNextProxy = useCallback((): ProxyEntry | null => {
    if (proxies.length === 0) return null
    // Count how many envs use each proxy
    const allEnvs = Object.values(environments).flat()
    const usage: Record<string, number> = {}
    for (const p of proxies) usage[p.id] = 0
    for (const env of allEnvs) {
      const match = proxies.find((p) => p.value === env.proxy)
      if (match) usage[match.id] = (usage[match.id] || 0) + 1
    }
    // Pick least used
    return proxies.reduce((a, b) => ((usage[a.id] || 0) <= (usage[b.id] || 0) ? a : b))
  }, [proxies, environments])

  // ── Workspace bounds ───────────────────────────────────────────────────────
  // Browser views sit above the HTML, so always reserve the tab bar: a visible
  // browser always has at least one tab. Using tabs.length here overlapped the
  // tab bar on the first launch (length was still 0 when bounds were computed).
  const getWorkspaceBounds = useCallback(() => {
    return {
      x: SIDEBAR_WIDTH,
      y: TITLEBAR_HEIGHT + TAB_BAR_HEIGHT,
      width: window.innerWidth - SIDEBAR_WIDTH,
      height: window.innerHeight - TITLEBAR_HEIGHT - TAB_BAR_HEIGHT
    }
  }, [])

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openModal = useCallback(
    async (m: Modal) => {
      if (activeEnvId) await window.silo.hideAllBrowsers()
      setModal(m)
    },
    [activeEnvId]
  )

  const closeModal = useCallback(async () => {
    setModal(null)
    if (activeEnvId) {
      const bounds = getWorkspaceBounds()
      await window.silo.showBrowser(activeEnvId, bounds)
    }
  }, [activeEnvId, getWorkspaceBounds])

  // ── Launch environment ─────────────────────────────────────────────────────
  const handleSelectEnv = useCallback(
    async (env: Environment, game: Game) => {
      const bounds = getWorkspaceBounds()
      if (tabs.find((t) => t.env.id === env.id)) {
        await window.silo.showBrowser(env.id, bounds)
        setActiveEnvId(env.id)
        return
      }
      await window.silo.launchBrowser(env.id, env.partition, game.url, env.proxy ?? null, bounds)
      setTabs((prev) => [...prev, { env, game }])
      setActiveEnvId(env.id)
    },
    [tabs, getWorkspaceBounds]
  )

  const handleSelectTab = useCallback(
    async (envId: string) => {
      const bounds = getWorkspaceBounds()
      await window.silo.showBrowser(envId, bounds)
      setActiveEnvId(envId)
    },
    [getWorkspaceBounds]
  )

  const handleCloseTab = useCallback(
    async (envId: string) => {
      await window.silo.closeBrowser(envId)
      const remaining = tabs.filter((t) => t.env.id !== envId)
      setTabs(remaining)
      if (activeEnvId === envId) {
        if (remaining.length > 0) {
          const next = remaining[remaining.length - 1]
          await window.silo.showBrowser(next.env.id, getWorkspaceBounds())
          setActiveEnvId(next.env.id)
        } else {
          setActiveEnvId(null)
          await window.silo.hideAllBrowsers()
        }
      }
    },
    [activeEnvId, tabs, getWorkspaceBounds]
  )

  // ── Resize ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = async (): Promise<void> => {
      if (activeEnvId && !modal) {
        await window.silo.resizeBrowser(activeEnvId, getWorkspaceBounds())
      }
    }
    window.addEventListener('resize', handleResize)
    return (): void => window.removeEventListener('resize', handleResize)
  }, [activeEnvId, modal, getWorkspaceBounds])

  // ── Game CRUD ──────────────────────────────────────────────────────────────
  const handleAddGame = useCallback(
    async (name: string, url: string) => {
      await window.silo.createGame(name, url)
      await loadGames()
      await closeModal()
    },
    [loadGames, closeModal]
  )

  const handleDeleteGame = useCallback(
    async (id: string) => {
      const envs = environments[id] || []
      const deletedIds = new Set(envs.map((e) => e.id))
      for (const env of envs) {
        if (tabs.find((t) => t.env.id === env.id)) await window.silo.closeBrowser(env.id)
      }
      await window.silo.deleteGame(id)
      await loadGames()
      const remaining = tabs.filter((t) => t.game.id !== id)
      setTabs(remaining)
      if (activeEnvId && deletedIds.has(activeEnvId)) {
        if (remaining.length > 0) {
          const next = remaining[remaining.length - 1]
          await window.silo.showBrowser(next.env.id, getWorkspaceBounds())
          setActiveEnvId(next.env.id)
        } else {
          setActiveEnvId(null)
          await window.silo.hideAllBrowsers()
        }
      }
    },
    [environments, tabs, activeEnvId, loadGames, getWorkspaceBounds]
  )

  // ── Environment CRUD ───────────────────────────────────────────────────────
  const handleAddEnv = useCallback(
    async (gameId: string, name: string) => {
      // Auto-assign proxy
      const proxy = getNextProxy()
      await window.silo.createEnvironment(gameId, name, proxy?.value ?? null)
      await loadGames()
      await closeModal()
    },
    [loadGames, closeModal, getNextProxy]
  )

  const handleDeleteEnv = useCallback(
    async (id: string) => {
      const wasActive = activeEnvId === id
      const remaining = tabs.filter((t) => t.env.id !== id)
      if (tabs.find((t) => t.env.id === id)) {
        await window.silo.closeBrowser(id)
        setTabs(remaining)
      }
      await window.silo.deleteEnvironment(id)
      await loadGames()
      if (wasActive) {
        if (remaining.length > 0) {
          const next = remaining[remaining.length - 1]
          await window.silo.showBrowser(next.env.id, getWorkspaceBounds())
          setActiveEnvId(next.env.id)
        } else {
          setActiveEnvId(null)
        }
      }
    },
    [tabs, activeEnvId, loadGames, getWorkspaceBounds]
  )

  const handleRenameGame = useCallback(
    async (id: string, newName: string) => {
      await window.silo.renameGame(id, newName)
      await loadGames()
    },
    [loadGames]
  )

  const handleRenameEnv = useCallback(
    async (id: string, newName: string) => {
      await window.silo.renameEnvironment(id, newName)
      await loadGames()
    },
    [loadGames]
  )

  const openEnvIds = tabs.map((t) => t.env.id)

  return (
    <div className="app">
      <TitleBar />
      <div className="app-body">
        <Sidebar
          games={games}
          environments={environments}
          activeEnvId={activeEnvId}
          openEnvIds={openEnvIds}
          proxyColorMap={proxyColorMap}
          onSelectEnv={handleSelectEnv}
          onAddGame={() => openModal({ type: 'addGame' })}
          onDeleteGame={handleDeleteGame}
          onAddEnv={(gameId) => {
            const game = games.find((g) => g.id === gameId)
            openModal({ type: 'addEnv', gameId, gameName: game?.name ?? '' })
          }}
          onDeleteEnv={handleDeleteEnv}
          onOpenSettings={() => openModal({ type: 'settings' })}
          onRenameGame={handleRenameGame}
          onRenameEnv={handleRenameEnv}
        />

        <div className="main-area">
          {games.length === 0 ? (
            <div className="welcome">
              <div className="welcome-inner">
                <div className="welcome-logo" style={{ padding: 0, overflow: 'hidden' }}>
                  <img
                    src={siloIcon}
                    alt="Silo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <h1 className="welcome-title">Welcome to Silo</h1>
                <p className="welcome-subtitle">
                  Launch multiple game accounts from one place — each completely isolated.
                </p>
                <button
                  className="btn-primary welcome-cta"
                  onClick={() => openModal({ type: 'addGame' })}
                >
                  Add your first game
                </button>
              </div>
            </div>
          ) : (
            <>
              <TabBar
                tabs={tabs}
                activeEnvId={activeEnvId}
                onSelect={handleSelectTab}
                onClose={handleCloseTab}
              />
              <Workspace hasActiveBrowser={activeEnvId !== null && !modal} />
            </>
          )}
        </div>
      </div>

      {modal?.type === 'addGame' && (
        <AddGameModal onConfirm={handleAddGame} onCancel={closeModal} />
      )}
      {modal?.type === 'addEnv' && (
        <AddEnvModal
          gameName={modal.gameName}
          hasProxies={proxies.length > 0}
          onConfirm={(name) => handleAddEnv(modal.gameId, name)}
          onCancel={closeModal}
        />
      )}
      {modal?.type === 'settings' && (
        <Settings proxies={proxies} onProxiesChange={handleProxiesChange} onClose={closeModal} />
      )}
    </div>
  )
}
