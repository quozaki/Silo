import { useState, useEffect, useCallback, useMemo, useRef, type JSX } from 'react'
import Sidebar from './components/Sidebar'
import TabBar from './components/TabBar'
import Workspace from './components/Workspace'
import TitleBar from './components/TitleBar'
import { AddGameModal, AddEnvModal } from './components/Modals'
import Settings, { ProxyEntry } from './components/Settings'
import SpecularButton from './components/SpecularButton'
import type { Game, Environment } from '../../shared/types'

interface OpenTab {
  env: Environment
  game: Game
}

type Modal =
  | { type: 'addGame' }
  | { type: 'addEnv'; gameId: string; gameName: string }
  | { type: 'settings' }
  | null

const SIDEBAR_WIDTH = 280
const TITLEBAR_HEIGHT = 32
const TAB_BAR_HEIGHT = 40

export default function App(): JSX.Element {
  const [games, setGames] = useState<Game[]>([])
  const [environments, setEnvironments] = useState<Record<string, Environment[]>>({})
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activeEnvId, setActiveEnvId] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [proxies, setProxies] = useState<ProxyEntry[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const creatingEnvRef = useRef(false)

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
    setSelectedGameId((prev) => {
      if (g.length === 0) return null
      if (prev && g.find((x) => x.id === prev)) return prev
      return g[0].id
    })
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
      setSelectedGameId(game.id)
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
      const tab = tabs.find((t) => t.env.id === envId)
      if (tab) setSelectedGameId(tab.game.id)
      await window.silo.showBrowser(envId, bounds)
      setActiveEnvId(envId)
    },
    [tabs, getWorkspaceBounds]
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
      const before = new Set(games.map((g) => g.id))
      await window.silo.createGame(name, url)
      await loadGames()
      // select the newly created game on first paint
      // loadGames already repopulated; pick the id that wasn't in `before`
      // defer to next tick so state from loadGames has landed
      setTimeout(async () => {
        try {
          const fresh = await window.silo.getGames()
          const created = fresh.find((g) => !before.has(g.id))
          if (created) setSelectedGameId(created.id)
        } catch {
          // noop
        }
      }, 0)
      await closeModal()
    },
    [games, loadGames, closeModal]
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
      if (selectedGameId === id) {
        // loadGames already queued a reselect to next available; override synchronously
        const nextGame = games.find((g) => g.id !== id)
        setSelectedGameId(nextGame ? nextGame.id : null)
      }
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
    [environments, tabs, activeEnvId, selectedGameId, games, loadGames, getWorkspaceBounds]
  )

  // ── Environment CRUD ───────────────────────────────────────────────────────
  const handleAddEnv = useCallback(
    async (gameId: string, name: string) => {
      if (creatingEnvRef.current) return
      creatingEnvRef.current = true
      try {
        const proxy = getNextProxy()
        await window.silo.createEnvironment(gameId, name, proxy?.value ?? null)
        await loadGames()
        await closeModal()
      } finally {
        creatingEnvRef.current = false
      }
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

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) ?? null,
    [games, selectedGameId]
  )
  const selectedEnvs = useMemo(
    () => (selectedGameId ? (environments[selectedGameId] ?? []) : []),
    [environments, selectedGameId]
  )

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
          selectedGameId={selectedGameId}
          onSelectGame={setSelectedGameId}
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
            <div className="welcome" role="region" aria-label="Welcome">
              <div className="welcome-inner">
                <div className="welcome-mark" aria-hidden="true">
                  <svg width="30" height="30" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                    <rect
                      x="4"
                      y="6.5"
                      width="20"
                      height="4"
                      rx="1.2"
                      fill="currentColor"
                      opacity="0.9"
                    />
                    <rect
                      x="4"
                      y="12"
                      width="20"
                      height="4"
                      rx="1.2"
                      fill="currentColor"
                      opacity="0.65"
                    />
                    <rect
                      x="4"
                      y="17.5"
                      width="20"
                      height="4"
                      rx="1.2"
                      fill="currentColor"
                      opacity="0.4"
                    />
                  </svg>
                </div>
                <h1 className="welcome-title">Welcome to Silo</h1>
                <p className="welcome-subtitle">
                  One place, many accounts — each completely isolated. No cookies bleed, ever.
                </p>

                <div className="welcome-actions">
                  <SpecularButton
                    className="welcome-cta"
                    radius={8}
                    tint="#FAFAFA"
                    tintOpacity={1}
                    textColor="#09090B"
                    lineColor="#ffffff"
                    baseColor="#27272A"
                    intensity={0.9}
                    shineSize={12}
                    shineFade={36}
                    thickness={1.1}
                    speed={0.28}
                    followMouse={true}
                    proximity={250}
                    size="md"
                    aria-label="Add your first game"
                    onClick={() => openModal({ type: 'addGame' })}
                  >
                    Add your first game
                  </SpecularButton>
                  <span className="welcome-kbd-hint" aria-label="Keyboard shortcut Command N">
                    or press
                    <kbd aria-hidden="true">⌘</kbd>
                    <kbd aria-hidden="true">N</kbd>
                  </span>
                </div>

                <div className="welcome-diagram" aria-hidden="true">
                  <div className="wd-col">
                    <span className="wd-col-label">Game</span>
                    <div className="wd-cols-body">
                      <div className="wd-game-card">
                        <span className="wd-game-thumb">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path
                              d="M1 3.5C1 2.67 1.67 2 2.5 2H5.5L7 3.5H11.5C12.33 3.5 13 4.17 13 5V10.5C13 11.33 12.33 12 11.5 12H2.5C1.67 12 1 11.33 1 10.5V3.5Z"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              fill="none"
                            />
                          </svg>
                        </span>
                        <span className="wd-game-name">StrategyCombat</span>
                        <span className="wd-count-badge">3</span>
                      </div>
                    </div>
                  </div>
                  <div className="wd-tree">
                    <svg width="44" height="114" viewBox="0 0 44 114" fill="none">
                      <path
                        d="M0 57H10M10 17V97M10 17H44M10 57H44M10 97H44"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div className="wd-col">
                    <span className="wd-col-label">Environments</span>
                    <div className="wd-cols-body">
                      <div className="wd-env-row">
                        <span className="wd-dot wd-dot-open" />
                        <span className="wd-env-name">Main</span>
                        <span
                          className="wd-proxy-dot"
                          style={{ background: '#60a5fa', color: '#60a5fa' }}
                        />
                      </div>
                      <div className="wd-env-row">
                        <span className="wd-dot" />
                        <span className="wd-env-name">Alt 1</span>
                      </div>
                      <div className="wd-env-row">
                        <span className="wd-dot" />
                        <span className="wd-env-name">Farm</span>
                        <span
                          className="wd-proxy-dot"
                          style={{ background: '#fb923c', color: '#fb923c' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="welcome-footnote">
                  Games are what you launch. Environments are who you launch as.
                </p>
                <div className="welcome-legend">
                  <span className="welcome-legend-item">
                    <i className="wd-dot wd-dot-open" />
                    live environment
                  </span>
                  <span className="welcome-legend-item">
                    <i
                      className="wd-dot wd-proxy-dot"
                      style={{ background: '#60a5fa', color: '#60a5fa' }}
                    />
                    assigned proxy
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <TabBar
                tabs={tabs}
                activeEnvId={activeEnvId}
                proxyColorMap={proxyColorMap}
                onSelect={handleSelectTab}
                onClose={handleCloseTab}
              />
              <Workspace
                hasActiveBrowser={activeEnvId !== null && !modal}
                selectedGame={selectedGame}
                envCount={selectedEnvs.length}
                gamesExist={games.length > 0}
              />
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
