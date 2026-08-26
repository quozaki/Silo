import { useState, useEffect, type JSX } from 'react'
import siloIcon from '../assets/icon.png'

export default function TitleBar(): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.silo.isMaximized().then(setIsMaximized).catch(console.error)
    return window.silo.onMaximizeChange(setIsMaximized)
  }, [])

  return (
    <div className="titlebar" role="banner">
      <div className="titlebar-drag">
        <div className="titlebar-logo-mark" style={{ padding: 0, overflow: 'hidden' }}>
          <img
            src={siloIcon}
            alt=""
            aria-hidden="true"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
        <span className="titlebar-title">Silo</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--text-dim)',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '2px 5px',
            borderRadius: 4,
            marginLeft: 6
          }}
          aria-hidden="true"
        >
          BETA
        </span>
      </div>
      <div className="titlebar-controls" role="toolbar" aria-label="Window controls">
        <button
          className="titlebar-btn minimize"
          onClick={() => window.silo.minimizeWindow()}
          aria-label="Minimize"
          title="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" aria-hidden="true">
            <rect width="10" height="1.4" rx="0.7" fill="currentColor" />
          </svg>
        </button>
        <button
          className="titlebar-btn maximize"
          onClick={() => window.silo.maximizeWindow()}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <path d="M3.5 1H10V7.5H7.5V10.5H1V4.5H3.5V1Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          )}
        </button>
        <button className="titlebar-btn close" onClick={() => window.silo.closeWindow()} aria-label="Close" title="Close">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
            <path d="M1.5 1.5L9.5 9.5M9.5 1.5L1.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
