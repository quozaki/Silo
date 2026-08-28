import { useState, useEffect, type JSX } from 'react'
import type { ProxyMetadata } from '../../../shared/types'

export type ProxyEntry = ProxyMetadata

const PROXY_COLORS = [
  '#a78bfa',
  '#60a5fa',
  '#34d399',
  '#fb923c',
  '#f472b6',
  '#facc15',
  '#38bdf8',
  '#f87171'
]

interface Props {
  onClose: () => void
  proxies: ProxyEntry[]
  onProxyAdd: (proxy: { label: string; address: string; color: string }) => Promise<void>
  onProxyDelete: (id: string) => Promise<void>
  onError?: (error: unknown) => void
}

export default function Settings({ onClose, proxies, onProxyAdd, onProxyDelete, onError }: Props): JSX.Element {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [smartEnabled, setSmartEnabled] = useState(true)
  const [smartLoading, setSmartLoading] = useState(true)
  const [smartSaving, setSmartSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    void window.silo
      .loadSettings()
      .then((s) => {
        if (cancelled) return
        if (s && typeof s.smartProxyEnabled === 'boolean') setSmartEnabled(s.smartProxyEnabled)
        setSmartLoading(false)
      })
      .catch(() => {
        onError?.(new Error('Could not load Smart Proxy settings.'))
        if (!cancelled) setSmartLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onError])

  const handleSmartToggle = async (): Promise<void> => {
    const next = !smartEnabled
    setSmartEnabled(next)
    setSmartSaving(true)
    try {
      await window.silo.saveSettings({ smartProxyEnabled: next })
    } catch (error) {
      // revert on failure
      setSmartEnabled(!next)
      onError?.(error)
    } finally {
      setSmartSaving(false)
    }
  }

  // Per-game overrides (only shown when needed)
  const [games, setGames] = useState<
    Array<{ id: string; name: string; url: string; proxy_mode?: string | null }>
  >([])
  const [gameModes, setGameModes] = useState<Record<string, string>>({})
  const [gamesLoading, setGamesLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void window.silo
      .getGames()
      .then(async (gs) => {
        if (cancelled) return
        setGames(gs as Array<{ id: string; name: string; url: string; proxy_mode?: string | null }>)
        const modes: Record<string, string> = {}
        await Promise.all(
          (gs as Array<{ id: string }>).map(async (g) => {
            try {
              const m = await window.silo.getGameProxyMode(g.id)
              modes[g.id] = typeof m === 'string' ? m : 'inherit'
            } catch (error) {
              modes[g.id] = 'inherit'
              onError?.(error)
            }
          })
        )
        if (!cancelled) {
          setGameModes(modes)
          setGamesLoading(false)
        }
      })
      .catch((error) => {
        onError?.(error)
        if (!cancelled) setGamesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [onError])

  const handleGameModeChange = async (gameId: string, mode: string): Promise<void> => {
    const prev = gameModes[gameId] || 'inherit'
    setGameModes((m) => ({ ...m, [gameId]: mode }))
    try {
      await window.silo.setGameProxyMode(gameId, mode)
    } catch (error) {
      setGameModes((m) => ({ ...m, [gameId]: prev }))
      onError?.(error)
    }
  }

  const handleAdd = async (): Promise<void> => {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      setError('Proxy address is required')
      return
    }
    const lowered = trimmedValue.toLowerCase()
    const protocols = ['socks5://', 'socks4://', 'http://']
    if (!protocols.some((p) => lowered.startsWith(p))) {
      setError('Must start with socks5://, socks4://, or http://')
      return
    }
    try {
      await onProxyAdd({
        label: label.trim() || `Proxy ${proxies.length + 1}`,
        address: trimmedValue,
        color: PROXY_COLORS[proxies.length % PROXY_COLORS.length]
      })
      setLabel('')
      setValue('')
      setError('')
    } catch (error) {
      onError?.(error)
    }
  }

  const handleDelete = (id: string): void => {
    void onProxyDelete(id).catch(onError)
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal settings-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="modal-header">
          <div className="modal-title" id="settings-title">
            Settings
          </div>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close settings">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M1 1L11 11M11 1L1 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="settings-section settings-panel">
          <div className="settings-panel-head">
            <div className="settings-panel-copy">
              <div className="settings-section-label settings-label-with-icon">
                <span className="settings-feature-icon" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="M2 6H10M6 2V10"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M3 3L4.2 4.2M8.8 7.8L10 9M3 9L4.2 7.8M8.8 4.2L10 3"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                  </svg>
                </span>
                Smart Proxy
                <span className="settings-badge">Save ~80% GB</span>
              </div>
              <div className="settings-section-desc">
                Routes only logins, API and WebSocket through your proxy. Static assets (images,
                audio, fonts, JS bundles) load{' '}
                <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>direct</strong>{' '}
                — never billed, never affects gameplay.
              </div>
            </div>
            <button
              className={`settings-switch ${smartEnabled ? 'is-on' : ''}`}
              role="switch"
              aria-checked={smartEnabled}
              aria-label="Toggle Smart Proxy"
              onClick={handleSmartToggle}
              disabled={smartLoading || smartSaving}
            >
              <span className="settings-switch-knob" />
            </button>
          </div>

          <div className={`settings-info ${smartEnabled ? 'is-on' : ''}`}>
            <div className="settings-info-row">
              <span className="settings-info-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                  <path
                    d="M7 6.5V8.5M7 5V5.6"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>
                {smartEnabled ? (
                  <>
                    <strong>Smart is ON.</strong> Game HTML, <code>/api</code> and WebSocket stay
                    via proxy. CDN, images, <code>.png .mp3 .woff2 .wasm</code> go direct.
                  </>
                ) : (
                  <>
                    <strong>Smart is OFF.</strong> Everything routes via proxy, including large game
                    assets.
                  </>
                )}
              </span>
            </div>
            {smartEnabled && (
              <div className="settings-pills">
                <span className="proxy-protocol-pill proxy-protocol-pill--accent">
                  via proxy: HTML / API / WS
                </span>
                <span className="proxy-protocol-pill">
                  direct: CDN / .png .js .css / fonts / media
                </span>
              </div>
            )}
            <div className="settings-note">
              Saves, logins and IndexedDB stay isolated.{' '}
              {smartEnabled ? 'Use Full for a title that checks asset IP.' : ''}
            </div>
          </div>

          {games.length > 0 && (
            <div className="settings-subsection">
              <div className="settings-subsection-title">Per-game override</div>
              <div className="settings-subsection-desc">
                Inherit = use global Smart setting. Use{' '}
                <strong style={{ color: 'var(--text-muted)' }}>Full</strong> if a title ever checks
                asset IP (rare, fallback keeps 100% via proxy).
              </div>
              <div className="settings-game-modes">
                {gamesLoading ? (
                  <div className="settings-loading">Loading games...</div>
                ) : (
                  games.map((g) => (
                    <div key={g.id} className="settings-game-row">
                      <div className="settings-game-info">
                        <span className="settings-game-name">{g.name}</span>
                        <span className="settings-game-url">
                          {(() => {
                            try {
                              return new URL(g.url).hostname
                            } catch {
                              return g.url
                            }
                          })()}
                        </span>
                      </div>
                      <select
                        className="settings-select"
                        value={gameModes[g.id] || 'inherit'}
                        onChange={(e) => handleGameModeChange(g.id, e.target.value)}
                        aria-label={`Proxy mode for ${g.name}`}
                      >
                        <option value="inherit">Inherit ({smartEnabled ? 'Smart' : 'Full'})</option>
                        <option value="smart">Smart - save GB</option>
                        <option value="full">Full - all via proxy</option>
                      </select>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-divider" />

        <div className="settings-section">
          <div className="settings-section-label">Proxy Pool</div>
          <div className="settings-section-desc">
            Add proxies here. Silo auto-assigns the least-used proxy to each new environment.
          </div>

          <div className="proxy-list" role="list" aria-label="Proxy list">
            {proxies.length === 0 && (
              <div className="proxy-empty" role="status">
                <div className="proxy-empty-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                    <path
                      d="M5.5 8H10.5M8 5.5V8"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span className="proxy-empty-title">No proxies yet</span>
                <span className="proxy-empty-desc">
                  Environments will launch without a proxy until you add one. Each new environment
                  auto-picks the least-used.
                </span>
              </div>
            )}
            {proxies.map((proxy) => (
              <div key={proxy.id} className="proxy-row" role="listitem">
                <span
                  className="proxy-color-dot"
                  style={{ background: proxy.color, color: proxy.color } as React.CSSProperties}
                  aria-hidden="true"
                />
                <div className="proxy-info">
                <span className="proxy-label" title={`${proxy.host}:${proxy.port}`}>
                  {proxy.label}
                </span>
                  <span className="proxy-ip" title={`${proxy.host}:${proxy.port}`}>
                    {proxy.host}:{proxy.port}
                  </span>
                </div>
                <span className="proxy-protocol-pill">{proxy.protocol}</span>
                <button
                  className="icon-btn danger proxy-delete-btn"
                  onClick={() => handleDelete(proxy.id)}
                  aria-label={`Remove proxy ${proxy.label}`}
                  title="Remove proxy"
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
            ))}
          </div>

          <div className="proxy-add-form">
            <div className="proxy-add-form-title">Add proxy</div>
            <div className="modal-field">
              <label htmlFor="proxy-label">
                Label <span className="label-optional">(optional)</span>
              </label>
              <input
                id="proxy-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. US Residential 1"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoComplete="off"
              />
            </div>
            <div className="modal-field">
              <label htmlFor="proxy-value">Proxy Address *</label>
              <input
                id="proxy-value"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setError('')
                }}
                placeholder="socks5://user:pass@ip:port"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className={error ? 'input-error' : undefined}
                aria-invalid={!!error}
                aria-describedby={error ? 'proxy-error' : 'proxy-hint'}
                autoComplete="off"
                inputMode="url"
              />
              {error && (
                <span id="proxy-error" role="alert" className="field-error">
                  {error}
                </span>
              )}
              <div id="proxy-hint" className="proxy-protocol-hint" aria-hidden="true">
                <span className="proxy-protocol-pill">socks5://</span>
                <span className="proxy-protocol-pill">socks4://</span>
                <span className="proxy-protocol-pill">http://</span>
                <span className="proxy-hint-inline">credentials included</span>
              </div>
            </div>
            <button className="btn-primary proxy-add-btn" onClick={handleAdd}>
              Add Proxy
            </button>
          </div>
        </div>

        <div className="modal-divider" />

        <div className="modal-actions">
          <button className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
