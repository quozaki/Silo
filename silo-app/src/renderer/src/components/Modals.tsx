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
  {
    name: 'Global Base Combat',
    url: 'https://www.globalbasecombat.com',
    category: 'Military RTS',
    image: globalBaseCombatImg
  },
  {
    name: 'Combat Siege',
    url: 'https://www.combatsiege.com',
    category: 'Military RTS',
    image: combatSiegeImg
  },
  {
    name: 'Panzer Quest',
    url: 'https://panzer.quest',
    category: 'Historical RTS',
    image: panzerQuestImg
  },
  {
    name: 'Planet Capture',
    url: 'https://www.planetcapture.io',
    category: 'Space RTS',
    image: planetCaptureImg
  },
  {
    name: 'Panzer Rush',
    url: 'https://www.panzerrush.com',
    category: 'Historical RTS',
    image: panzerRushImg
  },
  {
    name: 'Astro Conquest',
    url: 'https://www.astroconquest.com',
    category: 'Space RTS',
    image: astroConquestImg
  },
  {
    name: 'Alpha Wars',
    url: 'https://www.alphawars.com',
    category: 'Military RTS',
    image: alphaWarsImg
  },
  {
    name: 'Mars Battle',
    url: 'https://www.marsbattle.com',
    category: 'Sci-Fi RTS',
    image: marsBattleImg
  },
  {
    name: 'Strategy Combat',
    url: 'https://www.strategycombat.com',
    category: 'Historical RTS',
    image: strategyCombatImg
  },
  {
    name: 'River Combat',
    url: 'https://www.rivercombat.com',
    category: 'Military RTS',
    image: riverCombatImg
  },
  {
    name: 'Delta Wars',
    url: 'https://www.5.deltawars.com',
    category: 'Military RTS',
    image: deltaWarsImg
  },
  {
    name: 'Island Force',
    url: 'https://www.islandforce.com',
    category: 'Sci-Fi RTS',
    image: islandForceImg
  },
  {
    name: 'Desert Order',
    url: 'https://www.desertorder.com',
    category: 'Historical RTS',
    image: desertOrderImg
  },
  {
    name: 'Base Attack Force',
    url: 'https://www.baseattackforce.com',
    category: 'Military RTS',
    image: baseAttackForceImg
  },
  {
    name: 'Navy Quest',
    url: 'https://navy.quest',
    category: 'Military RTS',
    image: navyQuestImg
  }
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
  }, [])

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase()
    if (!q) return GAME_CATALOG
    return GAME_CATALOG.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        g.url.toLowerCase().includes(q)
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
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal catalog-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Game</div>
          <div className="modal-subtitle">Choose from the catalog or enter manually</div>
        </div>
        <div className="modal-divider" />

        {/* ── Catalog search ── */}
        <div className="catalog-search">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="search-icon">
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.1" />
            <path
              d="M8 8L10.5 10.5"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            placeholder="Search catalog..."
            value={catalogQuery}
            onChange={(e) => setCatalogQuery(e.target.value)}
            className="catalog-search-input"
          />
          {catalogQuery && (
            <button className="search-clear" onClick={() => setCatalogQuery('')}>
              ×
            </button>
          )}
        </div>

        {/* ── Catalog grid ── */}
        <div className="catalog-grid">
          {filteredCatalog.length === 0 ? (
            <div className="catalog-empty">No games found for &quot;{catalogQuery}&quot;</div>
          ) : (
            filteredCatalog.map((game) => (
              <button
                key={game.name}
                className={`catalog-card ${selectedName === game.name ? 'selected' : ''}`}
                onClick={() => handleSelect(game)}
                type="button"
              >
                <div className="catalog-card-thumb">
                  <img
                    src={game.image}
                    alt={game.name}
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

        <div className="catalog-divider">
          <span>or enter manually</span>
        </div>

        <div className="modal-field">
          <label>Name</label>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (selectedName && e.target.value !== selectedName) setSelectedName(null)
            }}
            placeholder="e.g. StrategyCombat"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div className="modal-field">
          <label>URL</label>
          <input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              // keep selection unless manually diverged from catalog url - optional
            }}
            placeholder="e.g. https://game.com"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!name.trim() || !url.trim()}
          >
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
  onConfirm: (name: string) => void
  onCancel: () => void
}

export function AddEnvModal({
  gameName,
  hasProxies,
  onConfirm,
  onCancel
}: AddEnvModalProps): JSX.Element {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (): void => {
    if (!name.trim()) return
    onConfirm(name.trim())
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Environment</div>
          <div className="modal-subtitle">{gameName}</div>
        </div>
        <div className="modal-divider" />
        <div className="modal-field">
          <label>Name</label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main, Alt 1, Farm"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        {hasProxies && (
          <div className="modal-proxy-info">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="var(--accent)" strokeWidth="1" />
              <path
                d="M6 5.5V8.5M6 3.5V4.5"
                stroke="var(--accent)"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <span>A proxy will be auto-assigned to this environment.</span>
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
