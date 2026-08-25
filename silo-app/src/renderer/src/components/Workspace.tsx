import type { JSX } from 'react'

export default function Workspace({
  hasActiveBrowser
}: {
  hasActiveBrowser: boolean
}): JSX.Element {
  if (hasActiveBrowser) {
    return <div className="workspace workspace-active" />
  }

  return (
    <div className="workspace workspace-empty">
      <div className="empty-state">
        <div className="empty-logo">
          <div className="empty-logo-inner" />
        </div>
        <div className="empty-title">No environment open</div>
        <div className="empty-sub">Select an environment from the sidebar to launch it.</div>
        <div className="empty-hint">
          <kbd>Click</kbd> an environment to open it
        </div>
      </div>
    </div>
  )
}
