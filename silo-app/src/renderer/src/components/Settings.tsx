import { useState, type JSX } from 'react'

export interface ProxyEntry {
  id: string
  label: string
  value: string // socks5://user:pass@ip:port
  color: string
}

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
  onProxiesChange: (proxies: ProxyEntry[]) => void
}

export default function Settings({ onClose, proxies, onProxiesChange }: Props): JSX.Element {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

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

  const handleDelete = (id: string): void => {
    onProxiesChange(proxies.filter((p) => p.id !== id))
  }

  // Extract IP for display
  const extractIP = (proxyVal: string): string => {
    try {
      const withoutProtocol = proxyVal.replace(/^(socks5|socks4|http):\/\//i, '')
      const hostPart = withoutProtocol.includes('@')
        ? withoutProtocol.split('@')[1]
        : withoutProtocol
      return hostPart.split(':')[0]
    } catch {
      return proxyVal
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Settings</div>
          <button className="settings-close-btn" onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M1 1L11 11M11 1L1 11"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="modal-divider" />

        {/* Proxy Pool */}
        <div className="settings-section">
          <div className="settings-section-label">Proxy Pool</div>
          <div className="settings-section-desc">
            Add proxies here. Silo auto-assigns them to environments — your users never see the
            technical details.
          </div>

          {/* Proxy list */}
          <div className="proxy-list">
            {proxies.length === 0 && <div className="proxy-empty">No proxies added yet.</div>}
            {proxies.map((proxy) => (
              <div key={proxy.id} className="proxy-row">
                <span className="proxy-color-dot" style={{ background: proxy.color }} />
                <div className="proxy-info">
                  <span className="proxy-label">{proxy.label}</span>
                  <span className="proxy-ip">{extractIP(proxy.value)}</span>
                </div>
                <button
                  className="icon-btn danger"
                  style={{ opacity: 1 }}
                  onClick={() => handleDelete(proxy.id)}
                  title="Remove proxy"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Add proxy form */}
          <div className="proxy-add-form">
            <div className="modal-field">
              <label>
                Label <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. US Residential 1"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="modal-field">
              <label>Proxy Address</label>
              <input
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setError('')
                }}
                placeholder="socks5://user:pass@ip:port"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                style={error ? { borderColor: 'var(--danger)' } : {}}
              />
              {error && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</span>}
              <span className="modal-hint">socks5:// · socks4:// · http://</span>
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
