import type { JSX } from 'react'
import type { Environment, Game } from '../../../shared/types'
import { GAME_CATALOG } from './Modals'

interface OpenTab {
  sessionId: string
  env: Environment
  game: Game
}

interface Props {
  tabs: OpenTab[]
  activeSessionId: string | null
  proxyColorMap?: Record<string, string>
  onSelect: (sessionId: string) => void
  onClose: (sessionId: string) => void
}

function getCatalogImage(game: Game): string | null {
  const match = GAME_CATALOG.find((c) => c.name === game.name || c.url === game.url)
  return match ? (match.image as string) : null
}

export default function TabBar({
  tabs,
  activeSessionId,
  proxyColorMap,
  onSelect,
  onClose
}: Props): JSX.Element | null {
  if (tabs.length === 0) return null

  return (
    <div className="tabbar-shell">
      <div className="tabbar-meta" aria-hidden="true">
        <span className="tabbar-meta-label">Tabs</span>
        <span className="tabbar-meta-count">{tabs.length}</span>
      </div>
      <div className="tabbar" role="tablist" aria-label="Running tabs">
        {tabs.map(({ sessionId, env, game }) => {
          const isActive = sessionId === activeSessionId
          const proxyColor = proxyColorMap?.[env.id]
          const dotStyle = proxyColor
            ? ({
                background: proxyColor,
                boxShadow: `0 0 8px ${proxyColor}66`
              } as React.CSSProperties)
            : undefined
          const thumb = getCatalogImage(game)

          return (
            <div
              key={sessionId}
              role="tab"
              aria-selected={isActive}
              aria-label={`${game.name} · ${env.name}${proxyColor ? ' proxy' : ''}`}
              tabIndex={isActive ? 0 : -1}
              className={`tab ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(sessionId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(sessionId)
                }
              }}
            >
              <span className="tab-thumb" aria-hidden="true">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M1 3.5C1 2.67 1.67 2 2.5 2H5.5L7 3.5H11.5C12.33 3.5 13 4.17 13 5V10.5C13 11.33 12.33 12 11.5 12H2.5C1.67 12 1 11.33 1 10.5V3.5Z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      fill="none"
                    />
                  </svg>
                )}
              </span>
              <span className="tab-dot" style={dotStyle} aria-hidden="true" />
              <span className="tab-label" title={`${game.name} · ${env.name}`}>
                <span className="tab-game-line">
                  <span className="tab-game-name" title={game.name}>
                    {game.name}
                  </span>
                  <span className="tab-sep" aria-hidden="true">
                    Game
                  </span>
                </span>
                <span className="tab-env-line">
                  <span className="tab-env-name" title={env.name}>
                    {env.name}
                  </span>
                  <span className="tab-env-kicker" aria-hidden="true">
                    Env
                  </span>
                </span>
              </span>
              <button
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(sessionId)
                }}
                aria-label={`Close ${game.name} · ${env.name}`}
                title="Close tab"
                tabIndex={0}
              >
                <svg width="8" height="8" viewBox="0 0 10 10" fill="none" aria-hidden="true">
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
        })}
      </div>
    </div>
  )
}
