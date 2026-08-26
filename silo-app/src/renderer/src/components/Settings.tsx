import { useState, useEffect, type JSX } from 'react'

export interface ProxyEntry {
  id: string
  label: string
  value: string
  color: string
}

const PROXY_COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fb923c', '#f472b6', '#facc15', '#38bdf8', '#f87171']

interface Props {
  onClose: () => void
  proxies: ProxyEntry[]
  onProxiesChange: (proxies: ProxyEntry[]) => void
}

export default function Settings({ onClose, proxies, onProxiesChange }: Props): JSX.Element {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleAdd = (): void => {
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
    if (proxies.some((p) => p.value === trimmedValue)) {
      setError('This proxy is already in the pool')
      return
    }
    const newProxy: ProxyEntry = {
      id: crypto.randomUUID(),
      label: label.trim() || `Proxy ${proxies.length + 1}`,
      value: trimmedValue,
      color: PROXY_COLORS[proxies.length % PROXY_COLORS.length]
    }
    onProxiesChange([...proxies, newProxy])
    setLabel('')
    setValue('')
    setError('')
  }

  const handleDelete = (id: string): void => onProxiesChange(proxies.filter((p) => p.id !== id))

  const extractIP = (proxyVal: string): string => {
    try {
      const withoutProtocol = proxyVal.replace(/^(socks5|socks4|http):\/\//i, '')
      const hostPart = withoutProtocol.includes('@') ? withoutProtocol.split('@')[1] : withoutProtocol
      return hostPart.split(':')[0]
    } catch {
      return proxyVal
    }
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
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
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
                    <path d="M5.5 8H10.5M8 5.5V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="proxy-empty-title">No proxies yet</span>
                <span className="proxy-empty-desc">Environments will launch without a proxy until you add one. Each new environment auto-picks the least-used.</span>
              </div>
            )}
            {proxies.map((proxy) => (
              <div key={proxy.id} className="proxy-row" role="listitem">
                <span className="proxy-color-dot" style={{ background: proxy.color, color: proxy.color } as React.CSSProperties} aria-hidden="true" />
                <div className="proxy-info">
                  <span className="proxy-label" title={proxy.value}>{proxy.label}</span>
                  <span className="proxy-ip" title={proxy.value}>{extractIP(proxy.value)}</span>
                </div>
                <span className="proxy-protocol-pill" style={{ fontSize: 10 }}>{proxy.value.split('://')[0]}</span>
                <button
                  className="icon-btn danger"
                  style={{ opacity: 1 }}
                  onClick={() => handleDelete(proxy.id)}
                  aria-label={`Remove proxy ${proxy.label}`}
                  title="Remove proxy"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="proxy-add-form">
            <div className="proxy-add-form-title">Add proxy</div>
            <div className="modal-field">
              <label htmlFor="proxy-label">
                Label <span style={{ color: 'var(--text-dim)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
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
                style={error ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px rgba(239,68,68,0.15)' } : {}}
                aria-invalid={!!error}
                aria-describedby={error ? 'proxy-error' : 'proxy-hint'}
                autoComplete="off"
                inputMode="url"
              />
              {error && (
                <span id="proxy-error" role="alert" style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>
                  {error}
                </span>
              )}
              <div id="proxy-hint" className="proxy-protocol-hint" aria-hidden="true">
                <span className="proxy-protocol-pill">socks5://</span>
                <span className="proxy-protocol-pill">socks4://</span>
                <span className="proxy-protocol-pill">http://</span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginLeft: 4, alignSelf: 'center' }}>credentials included</span>
              </div>
            </div>
            <button className="btn-primary" onClick={handleAdd} style={{ alignSelf: 'flex-start' }}>
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
