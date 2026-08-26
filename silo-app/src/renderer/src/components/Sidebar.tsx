import { useState, useMemo, type JSX } from 'react'
import type { Game, Environment } from '../../../shared/types'
import { GAME_CATALOG } from './Modals'

interface Props {
  games: Game[]
  environments: Record<string, Environment[]>
  activeEnvId: string | null
  openEnvIds: string[]
  proxyColorMap: Record<string, string>
  selectedGameId: string | null
  onSelectGame: (gameId: string) => void
  onSelectEnv: (env: Environment, game: Game) => void
  onAddGame: () => void
  onDeleteGame: (id: string) => void
  onAddEnv: (gameId: string) => void
  onDeleteEnv: (id: string) => void
  onOpenSettings: () => void
  onRenameGame: (id: string, newName: string) => void
  onRenameEnv: (id: string, newName: string) => void
}

export default function Sidebar({
  games,
  environments,
  activeEnvId,
  openEnvIds,
  proxyColorMap,
  selectedGameId,
  onSelectGame,
  onSelectEnv,
  onAddGame,
  onDeleteGame,
  onAddEnv,
  onDeleteEnv,
  onOpenSettings,
  onRenameGame,
  onRenameEnv
}: Props): JSX.Element {
  const [search, setSearch] = useState('')
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [editingGameDraft, setEditingGameDraft] = useState('')
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null)
  const [editingEnvDraft, setEditingEnvDraft] = useState('')

  const selectedGame = useMemo(
    () => games.find((g) => g.id === selectedGameId) ?? null,
    [games, selectedGameId]
  )
  const selectedEnvs = useMemo(
    () => (selectedGameId ? (environments[selectedGameId] ?? []) : []),
    [environments, selectedGameId]
  )

  const getCatalogImage = (game: Game): string | null => {
    const match = GAME_CATALOG.find((c) => c.name === game.name || c.url === game.url)
    return match ? (match.image as string) : null
  }

  const filteredGames = useMemo(() => {
    if (!search.trim()) return games
    const q = search.toLowerCase()
    return games.filter((g) => g.name.toLowerCase().includes(q) || g.url.toLowerCase().includes(q))
  }, [games, search])

  const filteredEnvs = useMemo(() => {
    if (!search.trim()) return selectedEnvs
    const q = search.toLowerCase()
    return selectedEnvs.filter((e) => e.name.toLowerCase().includes(q))
  }, [selectedEnvs, search])

  const totalEnvCount = useMemo(
    () => Object.values(environments).reduce((a, b) => a + b.length, 0),
    [environments]
  )

  const renderGameRow = (game: Game): JSX.Element => {
    const isSelected = game.id === selectedGameId
    const isEditing = editingGameId === game.id
    const envs = environments[game.id] ?? []
    const openCount = envs.filter((e) => openEnvIds.includes(e.id)).length

    const confirm = (): void => {
      const trimmed = editingGameDraft.trim()
      const original = game.name
      setEditingGameId(null)
      if (!trimmed || trimmed === original) return
      onRenameGame(game.id, trimmed)
    }
    const cancel = (): void => setEditingGameId(null)

    return (
      <div
        key={game.id}
        role="option"
        aria-selected={isSelected}
        tabIndex={0}
        className={`game-row ${isSelected ? 'selected' : ''}`}
        onClick={() => {
          if (isEditing) return
          onSelectGame(game.id)
        }}
        onKeyDown={(e) => {
          if (isEditing) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelectGame(game.id)
          }
        }}
      >
        <span className="game-folder-icon" aria-hidden="true">
          {(() => {
            const img = getCatalogImage(game)
            return img ? (
              <img
                src={img}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 3.5C1 2.67 1.67 2 2.5 2H5.5L7 3.5H11.5C12.33 3.5 13 4.17 13 5V10.5C13 11.33 12.33 12 11.5 12H2.5C1.67 12 1 11.33 1 10.5V3.5Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  fill="none"
                />
              </svg>
            )
          })()}
        </span>
        {isEditing ? (
          <input
            autoFocus
            value={editingGameDraft}
            aria-label={`Rename game ${game.name}`}
            onChange={(e) => setEditingGameDraft(e.target.value)}
            onBlur={confirm}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              else if (e.key === 'Escape') cancel()
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'var(--bg)',
              border: '1px solid var(--accent)',
              borderRadius: 6,
              outline: 'none',
              color: 'var(--text)',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'var(--font)',
              letterSpacing: '-0.01em',
              padding: '4px 8px',
              boxShadow: '0 0 0 3px var(--accent-ring)'
            }}
          />
        ) : (
          <span
            className="game-name"
            title={game.name}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditingGameId(game.id)
              setEditingGameDraft(game.name)
            }}
          >
            {game.name}
          </span>
        )}
        <span className="game-count-badge" title={`${envs.length} envs`}>
          {envs.length}
        </span>
        {openCount > 0 && (
          <span
            className="game-live-badge"
            aria-label={`${openCount} live`}
            title={`${openCount} live`}
          >
            <i className="game-live-dot" />
            {openCount}
          </span>
        )}
        <button
          className="icon-btn danger"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteGame(game.id)
          }}
          aria-label={`Delete game ${game.name}`}
          title="Delete game"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    )
  }

  const renderEnvRow = (env: Environment): JSX.Element | null => {
    if (!selectedGame) return null
    const isActive = env.id === activeEnvId
    const isOpen = openEnvIds.includes(env.id)
    const proxyColor = proxyColorMap[env.id]
    const isEditing = editingEnvId === env.id
    const dotUsesProxy = Boolean(isOpen && proxyColor)

    const confirm = (): void => {
      const trimmed = editingEnvDraft.trim()
      const original = env.name
      setEditingEnvId(null)
      if (!trimmed || trimmed === original) return
      onRenameEnv(env.id, trimmed)
    }
    const cancel = (): void => setEditingEnvId(null)

    return (
      <div
        key={env.id}
        className={`env-row ${isActive ? 'active' : ''}`}
        role="button"
        tabIndex={0}
        aria-current={isActive ? 'true' : undefined}
        aria-label={`${selectedGame.name} · ${env.name}${isOpen ? ' live' : ' idle'}${proxyColor ? ' proxy' : ''}`}
        onClick={() => {
          if (isEditing) return
          onSelectEnv(env, selectedGame)
        }}
        onKeyDown={(e) => {
          if (isEditing) return
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelectEnv(env, selectedGame)
          }
        }}
      >
        <span
          className={`env-dot ${isOpen ? 'open' : ''}`}
          style={
            dotUsesProxy
              ? { background: proxyColor, boxShadow: `0 0 8px ${proxyColor}66` }
              : undefined
          }
          aria-hidden="true"
        />
        {isEditing ? (
          <input
            autoFocus
            value={editingEnvDraft}
            aria-label={`Rename environment ${env.name}`}
            onChange={(e) => setEditingEnvDraft(e.target.value)}
            onBlur={confirm}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              else if (e.key === 'Escape') cancel()
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'var(--bg)',
              border: '1px solid var(--accent)',
              borderRadius: 6,
              outline: 'none',
              color: 'var(--text)',
              fontSize: '12.5px',
              fontWeight: 500,
              fontFamily: 'var(--font-mono)',
              padding: '4px 8px',
              boxShadow: '0 0 0 3px var(--accent-ring)'
            }}
          />
        ) : (
          <span
            className="env-name"
            title={env.name}
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditingEnvId(env.id)
              setEditingEnvDraft(env.name)
            }}
          >
            {env.name}
          </span>
        )}
        {/* Status text + proxy trailing */}
        <span
          className={`env-status ${isOpen ? 'env-status--live' : 'env-status--idle'}`}
          aria-hidden="true"
        >
          {isOpen ? 'Live' : 'Idle'}
        </span>
        <span className="env-indicators" aria-hidden="true">
          {proxyColor && !dotUsesProxy && (
            <span
              className="env-proxy-dot"
              style={{ background: proxyColor, color: proxyColor }}
              title={`Proxy ${proxyColor}`}
            />
          )}
          {proxyColor && dotUsesProxy && (
            <span
              className="env-proxy-dot"
              style={{ background: proxyColor, color: proxyColor, opacity: 0.95 }}
              title={`Proxy ${proxyColor}`}
            />
          )}
        </span>
        <span className="env-launch-icon" aria-hidden="true" title="Launch">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M4.5 3L7.5 6L4.5 9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <button
          className="icon-btn danger"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteEnv(env.id)
          }}
          aria-label={`Delete environment ${env.name}`}
          title="Delete environment"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <aside className="sidebar sidebar--split" role="navigation" aria-label="Games and environments">
      {/* Search — top chrome */}
      <div className="sidebar-search" role="search">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          className="search-icon"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
          <path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          id="silo-search"
          type="text"
          placeholder="Search games…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sidebar-search-input"
          aria-label="Search games"
          autoComplete="off"
          spellCheck={false}
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear search">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path
                d="M1 1L9 9M9 1L1 9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* GAMES — top scroll region */}
      <section className="sidebar-section sidebar-section--games" aria-label="Games">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">GAMES</span>
          <span
            className="count-pill"
            aria-label={`${games.length} games, ${totalEnvCount} environments total`}
            title={`${games.length} games · ${totalEnvCount} envs`}
          >
            {games.length}·{totalEnvCount}
          </span>
          <button
            className="sidebar-add-btn"
            onClick={onAddGame}
            aria-label="Add game"
            title="Add Game (⌘N)"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M6 2V10M2 6H10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div
          className={`sidebar-scroll games-scroll ${games.length === 0 ? 'sidebar-scroll--empty' : ''}`}
          role="listbox"
          aria-label="Games list"
          aria-multiselectable={false}
        >
          {games.length === 0 ? (
            <div className="sidebar-empty">
              <div className="sidebar-empty-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M3 5.5C3 4.12 4.12 3 5.5 3H8.5L11 5.5H16.5C17.88 5.5 19 6.62 19 8V15.5C19 16.88 17.88 18 16.5 18H5.5C4.12 18 3 16.88 3 15.5V5.5Z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    fill="none"
                  />
                  <path
                    d="M7 11H13M10 8V11"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                </svg>
              </div>
              <div className="sidebar-empty-text">
                <span>No games yet</span>
                <span>Games you add will appear here</span>
              </div>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="sidebar-empty">
              <div className="sidebar-empty-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                  <path
                    d="M12.5 12.5L17 17"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="sidebar-empty-text">
                <span>No results</span>
                <span>No results for &quot;{search}&quot;</span>
              </div>
            </div>
          ) : (
            filteredGames.map(renderGameRow)
          )}
        </div>
      </section>

      <div className="sidebar-divider" role="separator" aria-orientation="horizontal" />

      {/* ENVIRONMENTS — bottom scroll region (filtered to selectedGame) */}
      <section className="sidebar-section sidebar-section--envs" aria-label="Environments">
        <div className="sidebar-section-header">
          <div className="envs-header-text">
            <span className="sidebar-section-title">ENVIRONMENTS</span>
            <span
              className="envs-subtitle"
              title={
                selectedGame
                  ? `${selectedGame.name} · ${selectedEnvs.length} environments`
                  : 'No game selected'
              }
            >
              {selectedGame ? (
                <>
                  <span className="envs-subtitle-name">{selectedGame.name}</span>
                  <span className="envs-subtitle-dot" aria-hidden="true">
                    ·
                  </span>
                  <span>{selectedEnvs.length}</span>
                </>
              ) : (
                'Select a game'
              )}
            </span>
          </div>
          <button
            className="sidebar-add-btn"
            onClick={() => selectedGame && onAddEnv(selectedGame.id)}
            disabled={!selectedGame}
            aria-label={
              selectedGame
                ? `Add environment to ${selectedGame.name}`
                : 'Select a game to add an environment'
            }
            title={selectedGame ? `Add environment to ${selectedGame.name}` : 'Select a game first'}
            aria-disabled={!selectedGame}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M6 2V10M2 6H10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div
          className="sidebar-scroll envs-scroll"
          role="list"
          aria-label={selectedGame ? `${selectedGame.name} environments` : 'Environments'}
        >
          {!selectedGame ? (
            <div className="sidebar-empty sidebar-empty--compact">
              <div className="sidebar-empty-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect
                    x="2"
                    y="3"
                    width="14"
                    height="12"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <path
                    d="M6 8.5L9 11.5L12 8.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="9" cy="7" r="1.1" fill="currentColor" opacity="0.45" />
                </svg>
              </div>
              <div className="sidebar-empty-text">
                <span>No game selected</span>
                <span>Choose a game above to see its environments</span>
              </div>
            </div>
          ) : filteredEnvs.length === 0 && search.trim() ? (
            <div className="sidebar-empty sidebar-empty--compact">
              <div className="sidebar-empty-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.3" />
                  <path
                    d="M11 11L15 15"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="sidebar-empty-text">
                <span>No matches</span>
                <span>No environments for &quot;{search}&quot;</span>
              </div>
            </div>
          ) : selectedEnvs.length === 0 ? (
            <div className="sidebar-empty sidebar-empty--compact">
              <div className="sidebar-empty-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="12"
                    height="6"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <rect
                    x="3"
                    y="10"
                    width="12"
                    height="6"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    opacity="0.45"
                  />
                  <circle cx="6" cy="6" r="1" fill="currentColor" opacity="0.9" />
                </svg>
              </div>
              <div className="sidebar-empty-text">
                <span>No environments yet</span>
                <span>
                  Add one for{' '}
                  <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {selectedGame.name}
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <>
              {filteredEnvs.map(renderEnvRow)}
              <button
                className="add-env-btn"
                onClick={() => onAddEnv(selectedGame.id)}
                aria-label={`Add environment to ${selectedGame.name}`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M6 2V10M2 6H10"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                Add environment
              </button>
            </>
          )}
        </div>
      </section>

      <div className="sidebar-bottom">
        <button className="settings-btn" onClick={onOpenSettings} aria-label="Open settings">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M8 2v1.7M8 12.3V14M2 8h1.7M12.3 8H14M3.6 3.6l1.2 1.2M11.2 11.2l1.2 1.2M3.6 12.4l1.2-1.2M11.2 4.8l1.2-1.2"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          <span>Settings</span>
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-dim)',
              letterSpacing: '0.04em'
            }}
          >
            PROXY
          </span>
        </button>
      </div>
    </aside>
  )
}
