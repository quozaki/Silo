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
  sessionId: string
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
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [proxies, setProxies] = useState<ProxyEntry[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const creatingEnvRef = useRef(false)

  const reportError = useCallback((error: unknown): void => {
    setOperationError(error instanceof Error && error.message ? error.message : 'The requested operation could not be completed.')
  }, [])

  // proxyColorMap: envId -> color (derived from proxy assignments, not state)
  const proxyColorMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const envs of Object.values(environments)) {
      for (const env of envs) {
        if (env.proxy) {
          const match = proxies.find((p) => p.id === env.proxy)
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
      envMap[game.id] = await window.silo.getEnvironments(game.id)
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
    void loadGames().catch(reportError)
    void window.silo
      .loadProxies()
      .then(setProxies)
      .catch(reportError)
  }, [loadGames, reportError])

  useEffect(() => {
    return window.silo.onBrowserStateChange((event) => {
      if (!['FAILED', 'CRASHED'].includes(event.state)) return
      const sessionId = `${event.gameId}:${event.environmentId}`
      setTabs((current) => current.filter((tab) => tab.sessionId !== sessionId))
      setActiveSessionId((current) => (current === sessionId ? null : current))
    })
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Proxy management ───────────────────────────────────────────────────────
  const handleProxyAdd = useCallback(async (proxy: { label: string; address: string; color: string }): Promise<void> => {
    try {
      await window.silo.addProxy(proxy)
      setProxies(await window.silo.loadProxies())
    } catch (error) {
      reportError(error)
      throw error
    }
  }, [reportError])

  const handleProxyDelete = useCallback(async (id: string): Promise<void> => {
    try {
      await window.silo.removeProxy(id)
      setProxies(await window.silo.loadProxies())
    } catch (error) {
      reportError(error)
      throw error
    }
  }, [reportError])

  // Auto-assign next available proxy
  const getNextProxy = useCallback((): ProxyEntry | null => {
    if (proxies.length === 0) return null
    // Count how many envs use each proxy
    const allEnvs = Object.values(environments).flat()
    const usage: Record<string, number> = {}
    for (const p of proxies) usage[p.id] = 0
    for (const env of allEnvs) {
      const match = proxies.find((p) => p.id === env.proxy)
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
      if (activeSessionId) await window.silo.hideAllBrowsers()
      setModal(m)
    },
    [activeSessionId]
  )

  const closeModal = useCallback(async () => {
    setModal(null)
    if (activeSessionId) {
      const bounds = getWorkspaceBounds()
      const tab = tabs.find((item) => item.sessionId === activeSessionId)
      if (tab) await window.silo.showBrowser(tab.game.id, tab.env.id, bounds)
    }
  }, [activeSessionId, tabs, getWorkspaceBounds])

  // ── Launch environment ─────────────────────────────────────────────────────
  const handleSelectEnv = useCallback(
    async (env: Environment, game: Game) => {
      try {
        const bounds = getWorkspaceBounds()
        setSelectedGameId(game.id)
        const sessionId = `${game.id}:${env.id}`
        if (tabs.find((t) => t.sessionId === sessionId)) {
          await window.silo.showBrowser(game.id, env.id, bounds)
          setActiveSessionId(sessionId)
          return
        }
        await window.silo.launchBrowser(game.id, env.id, bounds)
        setTabs((prev) => [...prev, { sessionId, env, game }])
        setActiveSessionId(sessionId)
      } catch (error) {
        reportError(error)
      }
    },
    [tabs, getWorkspaceBounds, reportError]
  )

  const handleSelectTab = useCallback(
      async (sessionId: string) => {
        try {
          const bounds = getWorkspaceBounds()
          const tab = tabs.find((t) => t.sessionId === sessionId)
          if (tab) setSelectedGameId(tab.game.id)
          if (!tab) return
          await window.silo.showBrowser(tab.game.id, tab.env.id, bounds)
          setActiveSessionId(sessionId)
        } catch (error) {
          reportError(error)
        }
      },
    [tabs, getWorkspaceBounds, reportError]
  )

  const handleCloseTab = useCallback(
      async (sessionId: string) => {
        try {
          const tab = tabs.find((item) => item.sessionId === sessionId)
          if (!tab) return
          await window.silo.closeBrowser(tab.game.id, tab.env.id)
          const remaining = tabs.filter((t) => t.sessionId !== sessionId)
          setTabs(remaining)
          if (activeSessionId === sessionId) {
            if (remaining.length > 0) {
              const next = remaining[remaining.length - 1]
              await window.silo.showBrowser(next.game.id, next.env.id, getWorkspaceBounds())
              setActiveSessionId(next.sessionId)
            } else {
              setActiveSessionId(null)
              await window.silo.hideAllBrowsers()
            }
          }
        } catch (error) {
          reportError(error)
        }
    },
    [activeSessionId, tabs, getWorkspaceBounds, reportError]
  )

  // ── Resize ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = async (): Promise<void> => {
      const activeTab = tabs.find((tab) => tab.sessionId === activeSessionId)
      if (activeTab && !modal) {
        try {
          await window.silo.resizeBrowser(activeTab.game.id, activeTab.env.id, getWorkspaceBounds())
        } catch (error) {
          reportError(error)
        }
      }
    }
    window.addEventListener('resize', handleResize)
    return (): void => window.removeEventListener('resize', handleResize)
  }, [activeSessionId, tabs, modal, getWorkspaceBounds, reportError])

  // ── Game CRUD ──────────────────────────────────────────────────────────────
  const handleAddGame = useCallback(
    async (name: string, url: string) => {
      try {
        const before = new Set(games.map((g) => g.id))
        await window.silo.createGame(name, url)
        await loadGames()
        // select the newly created game on first paint
        // loadGames already repopulated; pick the id that wasn't in `before`
        // defer to next tick so state from loadGames has landed
        setTimeout(() => {
          void window.silo
            .getGames()
            .then((fresh) => {
              const created = fresh.find((g) => !before.has(g.id))
              if (created) setSelectedGameId(created.id)
            })
            .catch(reportError)
        }, 0)
        await closeModal()
      } catch (error) {
        reportError(error)
      }
    },
    [games, loadGames, closeModal, reportError]
  )

  const handleDeleteGame = useCallback(
    async (id: string) => {
      try {
        const envs = environments[id] || []
        const deletedIds = new Set(envs.map((e) => `${id}:${e.id}`))
        for (const tab of tabs.filter((item) => item.game.id === id)) {
          await window.silo.closeBrowser(tab.game.id, tab.env.id)
        }
        await window.silo.deleteGame(id)
        await loadGames()
        const remaining = tabs.filter((t) => t.game.id !== id)
        setTabs(remaining)
        if (selectedGameId === id) {
          const nextGame = games.find((g) => g.id !== id)
          setSelectedGameId(nextGame ? nextGame.id : null)
        }
        if (activeSessionId && deletedIds.has(activeSessionId)) {
          if (remaining.length > 0) {
            const next = remaining[remaining.length - 1]
            await window.silo.showBrowser(next.game.id, next.env.id, getWorkspaceBounds())
            setActiveSessionId(next.sessionId)
          } else {
            setActiveSessionId(null)
            await window.silo.hideAllBrowsers()
          }
        }
      } catch (error) {
        reportError(error)
      }
    },
    [environments, tabs, activeSessionId, selectedGameId, games, loadGames, getWorkspaceBounds, reportError]
  )

  // ── Environment CRUD ───────────────────────────────────────────────────────
  const handleAddEnv = useCallback(
    async (gameId: string, name: string, accountHint: string | null = null) => {
      if (creatingEnvRef.current) return
      creatingEnvRef.current = true
      try {
        const proxy = getNextProxy()
        await window.silo.createEnvironment(gameId, name, proxy?.id ?? null, accountHint)
        await loadGames()
        await closeModal()
      } catch (error) {
        reportError(error)
      } finally {
        creatingEnvRef.current = false
      }
    },
    [loadGames, closeModal, getNextProxy, reportError]
  )

  const handleSetEnvHint = useCallback(
    async (id: string, hint: string | null) => {
      try {
        await window.silo.setEnvironmentAccountHint(id, hint)
        await loadGames()
      } catch (error) {
        reportError(error)
      }
    },
    [loadGames, reportError]
  )

  const handleDeleteEnv = useCallback(
    async (id: string) => {
      try {
        const wasActive = tabs.some((tab) => tab.sessionId === activeSessionId && tab.env.id === id)
        const remaining = tabs.filter((t) => t.env.id !== id)
        for (const tab of tabs.filter((item) => item.env.id === id)) {
          await window.silo.closeBrowser(tab.game.id, tab.env.id)
        }
        setTabs(remaining)
        await window.silo.deleteEnvironment(id)
        await loadGames()
        if (wasActive) {
          if (remaining.length > 0) {
            const next = remaining[remaining.length - 1]
            await window.silo.showBrowser(next.game.id, next.env.id, getWorkspaceBounds())
            setActiveSessionId(next.sessionId)
          } else {
            setActiveSessionId(null)
          }
        }
      } catch (error) {
        reportError(error)
      }
    },
    [tabs, activeSessionId, loadGames, getWorkspaceBounds, reportError]
  )

  const handleRenameGame = useCallback(
    async (id: string, newName: string) => {
      try {
        await window.silo.renameGame(id, newName)
        await loadGames()
      } catch (error) {
        reportError(error)
      }
    },
    [loadGames, reportError]
  )

  const handleRenameEnv = useCallback(
    async (id: string, newName: string) => {
      try {
        await window.silo.renameEnvironment(id, newName)
        await loadGames()
      } catch (error) {
        reportError(error)
      }
    },
    [loadGames, reportError]
  )

  const activeEnvId = tabs.find((tab) => tab.sessionId === activeSessionId)?.env.id ?? null
  const openEnvIds = tabs.map((t) => t.env.id)

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) ?? null,
    [games, selectedGameId]
  )
  const selectedEnvs = useMemo(
    () => (selectedGameId ? (environments[selectedGameId] ?? []) : []),
    [environments, selectedGameId]
  )

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false
      return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (modal || isTypingTarget(e.target)) return

      const modifier = e.ctrlKey || e.metaKey
      if (modifier && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        if (e.shiftKey) {
          if (!selectedGame) return
          void openModal({ type: 'addEnv', gameId: selectedGame.id, gameName: selectedGame.name })
          return
        }
        void openModal({ type: 'addGame' })
        return
      }

      if (modifier && e.key.toLowerCase() === 'w' && activeSessionId) {
        e.preventDefault()
        void handleCloseTab(activeSessionId)
        return
      }

      if (tabs.length > 1 && e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()
        const activeIndex = Math.max(
          0,
          tabs.findIndex((tab) => tab.sessionId === activeSessionId)
        )
        const direction = e.key === 'ArrowRight' ? 1 : -1
        const nextIndex = (activeIndex + direction + tabs.length) % tabs.length
        void handleSelectTab(tabs[nextIndex].sessionId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return (): void => window.removeEventListener('keydown', handleKeyDown)
  }, [activeSessionId, handleCloseTab, handleSelectTab, modal, openModal, selectedGame, tabs])

  return (
    <div className="app">
      {operationError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            top: 42,
            right: 16,
            zIndex: 1000,
            maxWidth: 420,
            padding: '10px 12px',
            border: '1px solid #7f1d1d',
            borderRadius: 8,
            background: '#2a1111',
            color: '#fecaca',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            fontSize: 12
          }}
        >
          <span>{operationError}</span>
          <button
            type="button"
            onClick={() => setOperationError(null)}
            aria-label="Dismiss error"
            style={{ marginLeft: 12, color: 'inherit', background: 'transparent', border: 0, cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}
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
          onSetEnvHint={handleSetEnvHint}
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
                <h1 className="welcome-title">Silo</h1>
                <p className="welcome-subtitle">
                  A focused DITOGAMES workspace for running isolated accounts with intent.
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
                  <span className="welcome-kbd-hint" aria-label="Keyboard shortcut Control N">
                    or press
                    <kbd aria-hidden="true">Ctrl</kbd>
                    <kbd aria-hidden="true">N</kbd>
                  </span>
                </div>

                <div className="welcome-model" aria-hidden="true">
                  <div className="welcome-model-cell welcome-model-cell--game">
                    <span className="welcome-model-label">Games</span>
                    <strong>Where I go</strong>
                    <span>DITOGAMES sites</span>
                  </div>
                  <div className="welcome-model-cell welcome-model-cell--env">
                    <span className="welcome-model-label">Environments</span>
                    <strong>Who I am</strong>
                    <span>Persistent identities</span>
                  </div>
                  <div className="welcome-model-cell welcome-model-cell--tab">
                    <span className="welcome-model-label">Tabs</span>
                    <strong>What is running</strong>
                    <span>Game + identity</span>
                  </div>
                </div>

                <p className="welcome-footnote">
                  Select a game, choose an environment, and Silo opens the isolated tab.
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
                activeSessionId={activeSessionId}
                proxyColorMap={proxyColorMap}
                onSelect={handleSelectTab}
                onClose={handleCloseTab}
              />
              <Workspace
                hasActiveBrowser={activeEnvId !== null && !modal}
                selectedGame={selectedGame}
                envCount={selectedEnvs.length}
                gamesExist={games.length > 0}
                onAddEnvironment={
                  selectedGame
                    ? () =>
                        openModal({
                          type: 'addEnv',
                          gameId: selectedGame.id,
                          gameName: selectedGame.name
                        })
                    : undefined
                }
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
          onConfirm={(name, hint) => handleAddEnv(modal.gameId, name, hint)}
          onCancel={closeModal}
        />
      )}
      {modal?.type === 'settings' && (
        <Settings
          proxies={proxies}
          onProxyAdd={handleProxyAdd}
          onProxyDelete={handleProxyDelete}
          onClose={closeModal}
          onError={reportError}
        />
      )}
    </div>
  )
}
