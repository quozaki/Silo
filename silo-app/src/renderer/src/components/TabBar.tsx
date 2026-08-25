import type { JSX } from 'react'
import type { Environment, Game } from '../../../shared/types'

interface OpenTab {
  env: Environment
  game: Game
}

interface Props {
  tabs: OpenTab[]
  activeEnvId: string | null
  onSelect: (envId: string) => void
  onClose: (envId: string) => void
}

export default function TabBar({
  tabs,
  activeEnvId,
  onSelect,
  onClose
}: Props): JSX.Element | null {
  if (tabs.length === 0) return null

  return (
    <div className="tabbar">
      {tabs.map(({ env, game }) => (
        <div
          key={env.id}
          className={`tab ${env.id === activeEnvId ? 'active' : ''}`}
          onClick={() => onSelect(env.id)}
        >
          <span className="tab-dot" />
          <span className="tab-label">
            <span className="tab-game-name">{game.name}</span>
            <span className="tab-sep"> · </span>
            <span className="tab-env-name">{env.name}</span>
          </span>
          <button
            className="tab-close"
            onClick={(e) => {
              e.stopPropagation()
              onClose(env.id)
            }}
            title="Close tab"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M1 1L7 7M7 1L1 7"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
