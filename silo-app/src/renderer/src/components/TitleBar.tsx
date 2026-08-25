import { useState, useEffect, type JSX } from 'react'
import siloIcon from '../assets/icon.png'

export default function TitleBar(): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.silo.isMaximized().then(setIsMaximized).catch(console.error)
    return window.silo.onMaximizeChange(setIsMaximized)
  }, [])

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <div className="titlebar-logo-mark" style={{ padding: 0, overflow: 'hidden' }}>
          <img
            src={siloIcon}
            alt="Silo"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <span className="titlebar-title">Silo</span>
      </div>
      <div className="titlebar-controls">
        <button
          className="titlebar-btn minimize"
          onClick={() => window.silo.minimizeWindow()}
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <rect width="10" height="1.2" rx="0.6" fill="currentColor" />
          </svg>
        </button>
        <button
          className="titlebar-btn maximize"
          onClick={() => window.silo.maximizeWindow()}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M3 0H10V7H7V10H0V3H3V0Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect
                x="0.6"
                y="0.6"
                width="8.8"
                height="8.8"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.1"
              />
            </svg>
          )}
        </button>
        <button
          className="titlebar-btn close"
          onClick={() => window.silo.closeWindow()}
          title="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
