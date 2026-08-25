import { useState, useMemo, type JSX } from 'react'
import type { Game, Environment } from '../../../shared/types'
import { GAME_CATALOG } from './Modals'

interface Props {
  games: Game[]
  environments: Record<string, Environment[]>
  activeEnvId: string | null
  openEnvIds: string[]
  proxyColorMap: Record<string, string> // envId -> color
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
  onSelectEnv,
  onAddGame,
  onDeleteGame,
  onAddEnv,
  onDeleteEnv,
  onOpenSettings,
  onRenameGame,
  onRenameEnv
}: Props): JSX.Element {
  const [expandedGames, setExpandedGames] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  const [editingGameDraft, setEditingGameDraft] = useState('')
  const [editingEnvId, setEditingEnvId] = useState<string | null>(null)
  const [editingEnvDraft, setEditingEnvDraft] = useState('')

  const toggle = (gameId: string): void =>
    setExpandedGames((prev) => ({ ...prev, [gameId]: !prev[gameId] }))

  const isExpanded = (gameId: string): boolean => expandedGames[gameId] !== false

  const getCatalogImage = (game: Game): string | null => {
    const match = GAME_CATALOG.find((c) => c.name === game.name || c.url === game.url)
    return match ? (match.image as string) : null
  }

  // Filter games and environments by search
  const filtered = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    const result: Array<{ game: Game; envs: Environment[] }> = []
    for (const game of games) {
      const envs = environments[game.id] || []
      const gameMatch = game.name.toLowerCase().includes(q)
      const matchedEnvs = envs.filter((e) => e.name.toLowerCase().includes(q))
      if (gameMatch || matchedEnvs.length > 0) {
        result.push({ game, envs: gameMatch ? envs : matchedEnvs })
      }
    }
    return result
  }, [search, games, environments])

  const renderEnvRow = (env: Environment, game: Game): JSX.Element => {
    const isActive = env.id === activeEnvId
    const isOpen = openEnvIds.includes(env.id)
    const proxyColor = proxyColorMap[env.id]
    const isEditingEnv = editingEnvId === env.id

    const confirmEnvRename = (): void => {
      const trimmed = editingEnvDraft.trim()
      const original = env.name
      setEditingEnvId(null)
      if (!trimmed || trimmed === original) return
      onRenameEnv(env.id, trimmed)
    }

    const cancelEnvRename = (): void => {
      setEditingEnvId(null)
    }

    return (
      <div
        key={env.id}
        className={`env-row ${isActive ? 'active' : ''}`}
        onClick={() => {
          if (isEditingEnv) return
          onSelectEnv(env, game)
        }}
      >
        <span className="env-row-icon">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect
              x="1"
              y="1.5"
              width="11"
              height="10"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.1"
            />
            <path d="M4 5h5M4 7.5h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </span>
        {isEditingEnv ? (
          <input
            autoFocus
            value={editingEnvDraft}
            onChange={(e) => setEditingEnvDraft(e.target.value)}
            onBlur={confirmEnvRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              else if (e.key === 'Escape') cancelEnvRename()
            }}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--text-muted)',
              borderRadius: 0,
              outline: 'none',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontFamily: 'var(--font)',
              padding: '0 0 1px 0',
              width: '100%'
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
        <div className="env-indicators">
          {isOpen && (
            <span className="env-open-dot" style={{ background: proxyColor || 'var(--green)' }} />
          )}
          {proxyColor && !isOpen && (
            <span
              className="env-proxy-dot"
              style={{ background: proxyColor }}
              title="Proxy assigned"
            />
          )}
        </div>
        <button
          className="icon-btn danger"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteEnv(env.id)
          }}
          title="Delete environment"
        >
          ×
        </button>
      </div>
    )
  }

  const renderGameGroup = (game: Game, envs: Environment[]): JSX.Element => {
    const expanded = isExpanded(game.id)
    const isEditingGame = editingGameId === game.id

    const confirmGameRename = (): void => {
      const trimmed = editingGameDraft.trim()
      const original = game.name
      setEditingGameId(null)
      if (!trimmed || trimmed === original) return
      onRenameGame(game.id, trimmed)
    }

    const cancelGameRename = (): void => {
      setEditingGameId(null)
    }

    return (
      <div key={game.id} className="game-group">
        <div
          className="game-row"
          onClick={() => {
            if (isEditingGame) return
            toggle(game.id)
          }}
        >
          <span className="game-chevron">
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              style={{
                transform: expanded ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.15s'
              }}
            >
              <path
                d="M2 1L6 4L2 7"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="game-folder-icon" style={{ overflow: 'hidden' }}>
            {(() => {
              const img = getCatalogImage(game)
              return img ? (
                <img
                  src={img}
                  alt={game.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 3.5C1 2.67 1.67 2 2.5 2H5.5L7 3.5H11.5C12.33 3.5 13 4.17 13 5V10.5C13 11.33 12.33 12 11.5 12H2.5C1.67 12 1 11.33 1 10.5V3.5Z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    fill="none"
                  />
                </svg>
              )
            })()}
          </span>
          {isEditingGame ? (
            <input
              autoFocus
              value={editingGameDraft}
              onChange={(e) => setEditingGameDraft(e.target.value)}
              onBlur={confirmGameRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                else if (e.key === 'Escape') cancelGameRename()
              }}
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              style={{
                flex: 1,
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--text-muted)',
                borderRadius: 0,
                outline: 'none',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'var(--font)',
                letterSpacing: '0.01em',
                padding: '0 0 1px 0',
                width: '100%'
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
          <button
            className="icon-btn danger"
            onClick={(e) => {
              e.stopPropagation()
              onDeleteGame(game.id)
            }}
            title="Delete game"
          >
            ×
          </button>
        </div>

        {expanded && (
          <div className="env-list">
            {envs.map((env) => renderEnvRow(env, game))}
            <button className="add-env-btn" onClick={() => onAddEnv(game.id)}>
              + Add environment
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <span className="sidebar-header-title">Silo</span>
        <button className="sidebar-add-btn" onClick={onAddGame} title="Add Game">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1V11M1 6H11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="search-icon">
          <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.1" />
          <path d="M8 8L10.5 10.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sidebar-search-input"
        />
        {search && (
          <button className="search-clear" onClick={() => setSearch('')}>
            ×
          </button>
        )}
      </div>

      {/* Games list */}
      <div className="games-list">
        {games.length === 0 && !search && (
          <div className="sidebar-empty">
            No games yet.
            <br />
            Click <strong>+</strong> to add one.
          </div>
        )}

        {filtered ? (
          filtered.length === 0 ? (
            <div className="sidebar-empty">No results for &quot;{search}&quot;</div>
          ) : (
            filtered.map(({ game, envs }) => renderGameGroup(game, envs))
          )
        ) : (
          games.map((game) => renderGameGroup(game, environments[game.id] || []))
        )}
      </div>

      {/* Bottom — Settings */}
      <div className="sidebar-bottom">
        <button className="settings-btn" onClick={onOpenSettings}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.1" />
            <path
              d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
