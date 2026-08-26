import type { JSX } from 'react'
import type { Game } from '../../../shared/types'

interface Props {
  hasActiveBrowser: boolean
  selectedGame?: Game | null
  envCount?: number
  gamesExist?: boolean
}

export default function Workspace({
  hasActiveBrowser,
  selectedGame,
  envCount = 0,
  gamesExist = true
}: Props): JSX.Element {
  if (hasActiveBrowser) {
    return <div className="workspace workspace-active" aria-hidden="true" />
  }

  // No game selected at all (and games do exist) → prompt to pick a game
  if (gamesExist && !selectedGame) {
    return (
      <div className="workspace-empty" role="region" aria-label="Workspace">
        <div className="ws-hint-card">
          <div className="ws-hint-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
          <div className="ws-hint-title">Select a game</div>
          <div className="ws-hint-desc">
            Pick a game on the left. Its environments will appear in the lower pane — each is a
            sealed, isolated browser.
          </div>
          <div className="ws-hint-action" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M4 3L7 6L4 9"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Choose a game in the upper left</span>
          </div>
        </div>
      </div>
    )
  }

  // Game selected but it has no environments → encourage creation
  if (selectedGame && envCount === 0) {
    return (
      <div className="workspace-empty" role="region" aria-label="Workspace">
        <div className="ws-hint-card">
          <div className="ws-hint-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
          <div className="ws-hint-title">{selectedGame.name} — no environments yet</div>
          <div className="ws-hint-desc">
            Add an environment in the lower pane. Silo auto-assigns the least-used proxy and keeps
            every account isolated.
          </div>
          <div className="ws-hint-action" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M6 2V10M2 6H10"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <span>Add an environment below</span>
          </div>
        </div>
      </div>
    )
  }

  // Default: game selected, envs exist, but none open/selected → pick an env
  return (
    <div className="workspace-empty" role="region" aria-label="Workspace">
      <div className="ws-hint-card">
        <div className="ws-hint-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
        <div className="ws-hint-title">
          {selectedGame ? `Select an environment — ${selectedGame.name}` : 'Select an environment'}
        </div>
        <div className="ws-hint-desc">
          Choose an environment in the lower pane to launch its isolated browser. Each runs in a
          sealed partition — no cookies bleed.
        </div>
        <div className="ws-hint-action" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 6H9M7 3L10 6L7 9"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Select an environment from the sidebar</span>
        </div>
        <div className="ws-hint-kbd" aria-hidden="true">
          <span>Tip</span>
          <kbd>Double-click</kbd>
          <span>to rename</span>
        </div>
      </div>
    </div>
  )
}
