import type { JSX } from 'react'
import type { Game } from '../../../shared/types'

interface Props {
  hasActiveBrowser: boolean
  selectedGame?: Game | null
  envCount?: number
  gamesExist?: boolean
  onAddEnvironment?: () => void
}

export default function Workspace({
  hasActiveBrowser,
  selectedGame,
  envCount = 0,
  gamesExist = true,
  onAddEnvironment
}: Props): JSX.Element {
  if (hasActiveBrowser) {
    return <div className="workspace workspace-active" aria-hidden="true" />
  }

  // No game selected at all (and games do exist) → prompt to pick a game
  if (gamesExist && !selectedGame) {
    return (
      <div className="workspace-empty" role="region" aria-label="Workspace">
        <div className="ws-launch-panel">
          <div className="ws-launch-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 4.5C3 3.12 4.12 2 5.5 2H8.5L11 4.5H16.5C17.88 4.5 19 5.62 19 7V15.5C19 16.88 17.88 18 16.5 18H5.5C4.12 18 3 16.88 3 15.5V4.5Z"
                stroke="currentColor"
                strokeWidth="1.3"
                fill="none"
              />
              <path
                d="M7 10H13M10 7.5V11"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                opacity="0.5"
              />
            </svg>
          </div>
          <div className="ws-launch-copy">
            <span className="ws-launch-eyebrow">Ready</span>
            <h2 className="ws-launch-title">Choose a game</h2>
            <p className="ws-launch-desc">Games are destinations. Pick one in the upper sidebar.</p>
          </div>
          <div className="ws-model-strip" aria-hidden="true">
            <span className="ws-model-token is-current">Game</span>
            <span className="ws-model-token">Environment</span>
            <span className="ws-model-token">Tab</span>
          </div>
        </div>
      </div>
    )
  }

  // Game selected but it has no environments → encourage creation (MASTER §8C tier 2 zero-env variant)
  if (selectedGame && envCount === 0) {
    return (
      <div className="workspace-empty" role="region" aria-label="Workspace">
        <div className="ws-launch-panel">
          <div className="ws-launch-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect
                x="3"
                y="3"
                width="14"
                height="6"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <rect
                x="3"
                y="11"
                width="14"
                height="6"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
                opacity="0.42"
              />
              <circle cx="6.5" cy="6" r="1" fill="currentColor" opacity="0.9" />
            </svg>
          </div>
          <div className="ws-launch-copy">
            <span className="ws-launch-eyebrow">Selected game</span>
            <h2 className="ws-launch-title">{selectedGame.name}</h2>
            <p className="ws-launch-desc">
              Add an environment to create the identity you will launch as.
            </p>
          </div>
          <div className="ws-model-strip" aria-hidden="true">
            <span className="ws-model-token is-ready">Game</span>
            <span className="ws-model-token is-current">Environment</span>
            <span className="ws-model-token">Tab</span>
          </div>
          <button className="btn-secondary ws-launch-button" onClick={onAddEnvironment}>
            Add Environment
          </button>
        </div>
      </div>
    )
  }

  // Default: game selected, envs exist, but none open/selected → pick an env (MASTER §8C tier 2 with envs)
  return (
    <div className="workspace-empty" role="region" aria-label="Workspace">
      <div className="ws-launch-panel">
        <div className="ws-launch-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect
              x="3"
              y="3"
              width="14"
              height="14"
              rx="2.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M7 8.5L10 11.5L13 8.5"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="7" r="1.2" fill="currentColor" opacity="0.5" />
          </svg>
        </div>
        <div className="ws-launch-copy">
          <span className="ws-launch-eyebrow">Selected game</span>
          <h2 className="ws-launch-title">
            {selectedGame ? selectedGame.name : 'Select an environment'}
          </h2>
          <p className="ws-launch-desc">
            Choose an environment in the lower sidebar to open the isolated browser tab.
          </p>
        </div>
        <div className="ws-model-strip" aria-hidden="true">
          <span className="ws-model-token is-ready">Game</span>
          <span className="ws-model-token is-current">Environment</span>
          <span className="ws-model-token">Tab</span>
        </div>
        <div className="ws-shortcuts" aria-hidden="true">
          <span>Ctrl+Shift+N</span>
          <span>new environment</span>
        </div>
      </div>
    </div>
  )
}
