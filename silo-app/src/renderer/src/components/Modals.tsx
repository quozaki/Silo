import { useState, useEffect, useRef, useMemo, type JSX } from 'react'
import globalBaseCombatImg from '../assets/catalog/global_base_combat_6b.jpg'
import combatSiegeImg from '../assets/catalog/combat-siege-3.jpg'
import panzerQuestImg from '../assets/catalog/panzer-quest-3.jpg'
import planetCaptureImg from '../assets/catalog/planet-capture-3.jpg'
import panzerRushImg from '../assets/catalog/panzer-rush-3.jpg'
import astroConquestImg from '../assets/catalog/astro-conquest-4.jpg'
import alphaWarsImg from '../assets/catalog/alpha-wars-3.jpg'
import marsBattleImg from '../assets/catalog/mars-battle-3.jpg'
import strategyCombatImg from '../assets/catalog/strategy-combat-3.jpg'
import riverCombatImg from '../assets/catalog/river-combat-4.jpg'
import deltaWarsImg from '../assets/catalog/delta-wars-4.jpg'
import islandForceImg from '../assets/catalog/island-force-3.jpg'
import desertOrderImg from '../assets/catalog/desert-order-4.jpg'
import baseAttackForceImg from '../assets/catalog/base-attack-force-4.jpg'
import navyQuestImg from '../assets/catalog/navy-quest-4.jpg'

export const GAME_CATALOG = [
  { name: 'Global Base Combat', url: 'https://www.globalbasecombat.com', category: 'Military RTS', image: globalBaseCombatImg },
  { name: 'Combat Siege', url: 'https://www.combatsiege.com', category: 'Military RTS', image: combatSiegeImg },
  { name: 'Panzer Quest', url: 'https://panzer.quest', category: 'Historical RTS', image: panzerQuestImg },
  { name: 'Planet Capture', url: 'https://www.planetcapture.io', category: 'Space RTS', image: planetCaptureImg },
  { name: 'Panzer Rush', url: 'https://www.panzerrush.com', category: 'Historical RTS', image: panzerRushImg },
  { name: 'Astro Conquest', url: 'https://www.astroconquest.com', category: 'Space RTS', image: astroConquestImg },
  { name: 'Alpha Wars', url: 'https://www.alphawars.com', category: 'Military RTS', image: alphaWarsImg },
  { name: 'Mars Battle', url: 'https://www.marsbattle.com', category: 'Sci-Fi RTS', image: marsBattleImg },
  { name: 'Strategy Combat', url: 'https://www.strategycombat.com', category: 'Historical RTS', image: strategyCombatImg },
  { name: 'River Combat', url: 'https://www.rivercombat.com', category: 'Military RTS', image: riverCombatImg },
  { name: 'Delta Wars', url: 'https://www.5.deltawars.com', category: 'Military RTS', image: deltaWarsImg },
  { name: 'Island Force', url: 'https://www.islandforce.com', category: 'Sci-Fi RTS', image: islandForceImg },
  { name: 'Desert Order', url: 'https://www.desertorder.com', category: 'Historical RTS', image: desertOrderImg },
  { name: 'Base Attack Force', url: 'https://www.baseattackforce.com', category: 'Military RTS', image: baseAttackForceImg },
  { name: 'Navy Quest', url: 'https://navy.quest', category: 'Military RTS', image: navyQuestImg }
] as const

interface AddGameModalProps {
  onConfirm: (name: string, url: string) => void
  onCancel: () => void
}

export function AddGameModal({ onConfirm, onCancel }: AddGameModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [catalogQuery, setCatalogQuery] = useState('')
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase()
    if (!q) return GAME_CATALOG
    return GAME_CATALOG.filter(
      (g) => g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q) || g.url.toLowerCase().includes(q)
    )
  }, [catalogQuery])

  const handleSelect = (game: (typeof GAME_CATALOG)[number]): void => {
    setSelectedName(game.name)
    setName(game.name)
    setUrl(game.url)
  }

  const handleSubmit = (): void => {
    const trimmedName = name.trim()
    const trimmedUrl = url.trim()
    if (!trimmedName || !trimmedUrl) return
    const finalUrl = trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`
    onConfirm(trimmedName, finalUrl)
  }

  return (
    <div className="modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="modal catalog-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-game-title"
        aria-describedby="add-game-desc"
      >
        <div className="modal-header">
          <div className="modal-title" id="add-game-title">
            Add Game
          </div>
          <div className="modal-subtitle" id="add-game-desc">
            Choose from the catalog or enter manually — 15 curated titles
          </div>
        </div>
        <div className="modal-divider" />

        <div className="catalog-search">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ color: 'var(--text-dim)', flexShrink: 0 }}>
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9 9L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search catalog…"
            value={catalogQuery}
            onChange={(e) => setCatalogQuery(e.target.value)}
            className="catalog-search-input"
            aria-label="Search game catalog"
            autoComplete="off"
          />
          {catalogQuery && (
            <button
              className="search-clear"
              onClick={() => setCatalogQuery('')}
              aria-label="Clear catalog search"
              style={{ position: 'static', transform: 'none' }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <div className="catalog-grid" role="listbox" aria-label="Game catalog">
          {filteredCatalog.length === 0 ? (
            <div className="catalog-empty" role="status">
              No games found for &quot;{catalogQuery}&quot;
            </div>
          ) : (
            filteredCatalog.map((game) => (
              <button
                key={game.name}
                className={`catalog-card ${selectedName === game.name ? 'selected' : ''}`}
                onClick={() => handleSelect(game)}
                type="button"
                role="option"
                aria-selected={selectedName === game.name}
                aria-label={`${game.name}, ${game.category}`}
              >
                <div className="catalog-card-thumb">
                  <img
                    src={game.image}
                    alt=""
                    loading="lazy"
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
                <div className="catalog-card-info">
                  <span className="catalog-card-name">{game.name}</span>
                  <span className="catalog-card-category">{game.category}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="catalog-divider" aria-hidden="true">
          <span>or enter manually</span>
        </div>

        <div className="modal-field">
          <label htmlFor="game-name">Name *</label>
          <input
            id="game-name"
            ref={nameRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (selectedName && e.target.value !== selectedName) setSelectedName(null)
            }}
            placeholder="e.g. StrategyCombat"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoComplete="off"
            aria-required="true"
          />
        </div>
        <div className="modal-field">
          <label htmlFor="game-url">URL *</label>
          <input
            id="game-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="e.g. https://game.com"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoComplete="off"
            inputMode="url"
            aria-required="true"
          />
          <span className="modal-hint">Must be a valid https:// address — we add https:// if missing</span>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!name.trim() || !url.trim()}>
            Create Game
          </button>
        </div>
      </div>
    </div>
  )
}

interface AddEnvModalProps {
  gameName: string
  hasProxies: boolean
  onConfirm: (name: string, accountHint: string | null) => void
  onCancel: () => void
}

export function AddEnvModal({ gameName, hasProxies, onConfirm, onCancel }: AddEnvModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [accountHint, setAccountHint] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const handleSubmit = (): void => {
    if (!name.trim()) return
    const hint = accountHint.trim() ? accountHint.trim().slice(0, 64) : null
    onConfirm(name.trim(), hint)
  }

  return (
    <div className="modal-overlay" onClick={onCancel} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-env-title"
      >
        <div className="modal-header">
          <div className="modal-title" id="add-env-title">
            Add Environment
          </div>
          <div className="modal-subtitle">{gameName}</div>
        </div>
        <div className="modal-divider" />
        <div className="modal-field">
          <label htmlFor="env-name">Name *</label>
          <input
            id="env-name"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main, Alt 1, Farm"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoComplete="off"
            aria-required="true"
          />
          <span className="modal-hint">Each environment is a fully isolated browser</span>
        </div>
        <div className="modal-field">
          <label htmlFor="env-hint">Account hint <span className="label-optional">(optional)</span></label>
          <input
            id="env-hint"
            value={accountHint}
            onChange={(e) => setAccountHint(e.target.value)}
            placeholder="e.g. player@email.com or username"
            maxLength={64}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            autoComplete="off"
            aria-label="Account hint - username or email, not a password"
          />
          <span className="modal-hint">Shown in sidebar to remember which account to login — not a password, not auto-filled</span>
        </div>
        {hasProxies && (
          <div className="modal-proxy-info" role="status">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="var(--accent)" strokeWidth="1.3" />
              <path d="M8 7.5V11M8 5.5V6.2" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>A proxy will be auto-assigned — least-used from your pool.</span>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!name.trim()}>
            Create Environment
          </button>
        </div>
      </div>
    </div>
  )
}
