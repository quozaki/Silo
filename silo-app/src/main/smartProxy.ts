import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { atomicWriteFile } from './storage'
import { storageReadError, persistenceError } from './errors'

// ── Types ────────────────────────────────────────────────────────────────────
export type GameProxyMode = 'inherit' | 'smart' | 'full'
export type SmartProxyMode = 'smart' | 'full'

export interface SmartProxySettings {
  smartProxyEnabled: boolean
}

const DEFAULT_SETTINGS: SmartProxySettings = {
  smartProxyEnabled: true
}

// ── Settings persistence ─────────────────────────────────────────────────────
function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

export function loadSmartProxySettings(): SmartProxySettings {
  const p = getSettingsPath()
  const sourcePath = existsSync(p) ? p : `${p}.bak`
  if (!existsSync(sourcePath)) return { ...DEFAULT_SETTINGS }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(sourcePath, 'utf-8'))
  } catch (error) {
    const backupPath = `${p}.bak`
    if (!existsSync(backupPath)) throw storageReadError('smart proxy settings', error)
    try {
      parsed = JSON.parse(readFileSync(backupPath, 'utf-8'))
      console.warn('Recovered smart proxy settings from the previous valid version.')
    } catch (backupError) {
      throw storageReadError('smart proxy settings or its backup', backupError)
    }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw storageReadError('smart proxy settings', new Error('Settings JSON must contain an object'))
  }
  const value = parsed as Record<string, unknown>
  return typeof value.smartProxyEnabled === 'boolean'
    ? { smartProxyEnabled: value.smartProxyEnabled }
    : { ...DEFAULT_SETTINGS }
}

export function saveSmartProxySettings(settings: SmartProxySettings): void {
  const p = getSettingsPath()
  let existing: Record<string, unknown> = {}
  if (existsSync(p)) {
    try {
      const parsed = JSON.parse(readFileSync(p, 'utf-8')) as unknown
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Settings JSON must contain an object')
      existing = parsed as Record<string, unknown>
    } catch (error) {
      throw storageReadError('smart proxy settings', error)
    }
  }
  const next = { ...existing, smartProxyEnabled: settings.smartProxyEnabled }
  try {
    atomicWriteFile(p, JSON.stringify(next, null, 2), { backupPath: `${p}.bak` })
  } catch (error) {
    throw persistenceError('smart proxy settings', error)
  }
}

// ── Proxy parsing ────────────────────────────────────────────────────────────
export interface ParsedProxy {
  protocol: string // socks5 | socks4 | http | https
  host: string
  port: string
  username?: string
  password?: string
  hostPort: string // host:port
  original: string
}

export function parseProxy(proxy: string): ParsedProxy | null {
  try {
    const u = new URL(proxy)
    const protocol = u.protocol.replace(':', '').toLowerCase()
    if (!['socks5', 'socks4', 'http', 'https'].includes(protocol)) return null
    const host = u.hostname
    if (!host) return null
    if (u.pathname !== '/' || u.search || u.hash) return null
    const port = u.port || (protocol === 'http' ? '80' : protocol === 'https' ? '443' : '1080')
    if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) return null
    const username = u.username ? decodeURIComponent(u.username) : undefined
    const password = u.password ? decodeURIComponent(u.password) : undefined
    return {
      protocol,
      host,
      port,
      username,
      password,
      hostPort: `${host}:${port}`,
      original: proxy
    }
  } catch {
    return null
  }
}

// ── Domain helpers ───────────────────────────────────────────────────────────
export function getBaseDomain(host: string): string {
  const h = host.toLowerCase().trim()
  if (!h || h === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(h) || h.includes(':')) return h
  const parts = h.split('.').filter(Boolean)
  if (parts.length <= 2) return h
  // Keep the registrable domain for the public suffixes relevant to desktop
  // game traffic. This avoids treating co.uk/org.au itself as a registrable
  // domain without pulling a full DNS library into the main process.
  const secondLevelSuffixes = new Set([
    'ac.uk', 'co.uk', 'gov.uk', 'ltd.uk', 'me.uk', 'net.uk', 'org.uk',
    'com.au', 'net.au', 'org.au', 'co.jp', 'co.nz', 'com.br', 'com.cn',
    'com.mx', 'co.za', 'co.in', 'co.id', 'co.th', 'com.tr', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp', 'com.sg', 'com.hk', 'com.tw'
  ])
  const suffix = parts.slice(-2).join('.')
  if (secondLevelSuffixes.has(suffix)) return parts.slice(-3).join('.')
  // Heuristic for unknown 2-letter ccTLDs with short SLD (e.g., co.in, com.tr) — prevents treating co.uk-like suffixes as base.
  const tld = parts[parts.length - 1]
  const sld = parts[parts.length - 2]
  if (tld.length === 2 && sld.length <= 3 && parts.length >= 3) return parts.slice(-3).join('.')
  return parts.slice(-2).join('.')
}

export function getGameHost(gameUrl: string): string | null {
  try {
    const input = gameUrl.trim()
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`
    const u = new URL(candidate)
    if (!['http:', 'https:'].includes(u.protocol) || !u.hostname) return null
    return u.hostname.toLowerCase()
  } catch {
    return null
  }
}

// ── PAC generation ───────────────────────────────────────────────────────────
// Smart mode: proxy only identity traffic (document, API, WS), bypass static/CDN.
// Safe invariant: never proxy-bypass HTML/JSON/XHR to game host.
// We bypass:
//   1) Any host not belonging to game's base domain (CDN, tracker, googleapis, cloudfront) -> DIRECT (100% safe, biggest saving)
//   2) Same-base hosts but static asset URLs (png/jpg/woff2/mp3/wasm/css/js etc) -> DIRECT (safe, assets are cacheable, not auth)

const SAFE_STATIC_EXTS = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'ico',
  'avif',
  'bmp',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'otf',
  'mp3',
  'wav',
  'ogg',
  'flac',
  'mp4',
  'webm',
  'mov',
  'wasm',
  'css',
  'js',
  'map'
]

// Build PAC script text (not data URL). Caller wraps in data:text/javascript,
export function buildPacScript(proxyString: string, gameUrl: string | null): string | null {
  const parsed = parseProxy(proxyString)
  if (!parsed) return null

  const proxyType = parsed.protocol === 'socks5' ? 'SOCKS5' : parsed.protocol === 'socks4' ? 'SOCKS' : 'PROXY'
  const hostPort = parsed.hostPort

  let gameHost = ''
  let gameBase = ''
  if (gameUrl) {
    const gh = getGameHost(gameUrl)
    if (gh) {
      gameHost = gh
      gameBase = getBaseDomain(gh)
    }
  }

  // If we can't determine game host, fallback to full proxy (never bypass, gaming safe)
  if (!gameHost || !gameBase) {
    return `function FindProxyForURL(url, host) { return "${proxyType} ${hostPort}"; }`
  }

  // Use precise extension match: "*.ext" OR ".ext?"/".ext#" via indexOf to avoid "*.js*" matching "*.json"
  // Note: shExpMatch "*?*" uses ? as wildcard (single char), so "*.js?*" would falsely match "*.json". Use indexOf for ?/#.
  const extChecks = SAFE_STATIC_EXTS.map(
    (ext) => `(shExpMatch(url, "*.${ext}") || url.indexOf(".${ext}?") != -1 || url.indexOf(".${ext}#") != -1)`
  ).join(' || ')

  // PAC must be case-insensitive for host/url
  // dnsDomainIs(host, ".base") checks suffix. Also handle exact host matches.
  return `
function FindProxyForURL(url, host) {
  var origUrl = url;
  url = url.toLowerCase();
  host = host.toLowerCase();
  if (isPlainHostName(host)) return "DIRECT";
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "DIRECT";
  // Foreign hosts (CDN, analytics, trackers) -> DIRECT. Only game base domain stays via proxy.
  var isGameHost = (host === "${gameHost}" || host === "${gameBase}" || dnsDomainIs(host, ".${gameBase}"));
  if (!isGameHost) return "DIRECT";
  // Same-base static assets -> DIRECT (cacheable, not auth). Saves GB even when assets on same domain.
  if (${extChecks}) return "DIRECT";
  // Also bypass common static path prefixes even without extension (e.g., /assets/, /static/ with hashed names) - conservative: only if not /api/ /auth/ /ws
  // We keep it extension-only for v1 to stay safe: no path heuristic.
  // Everything else (document, XHR, fetch, WS, HTML, JSON) -> proxy
  return "${proxyType} ${hostPort}";
}
`.trim()
}

// Resolve effective mode
export function resolveEffectiveMode(
  globalSettings: SmartProxySettings,
  gameMode: GameProxyMode | null | undefined
): SmartProxyMode {
  if (gameMode === 'full') return 'full'
  if (gameMode === 'smart') return 'smart'
  // inherit or null/undefined -> use global
  return globalSettings.smartProxyEnabled ? 'smart' : 'full'
}

// Credentials are scoped first by session and then by proxy identity. The
// active identity is used for Electron's login event, which supplies host and
// port but not the originating proxy record. Keeping the identity in the inner
// map prevents two legitimate same-host proxies from overwriting one another.
export const proxyCredentials = new Map<Electron.Session, Map<string, { username: string; password: string }>>()
const activeProxyIds = new Map<Electron.Session, string>()
const activeProxyEndpoints = new Map<Electron.Session, string>()

function normalizeProxyHost(host: string): string {
  return host.replace(/^\[|\]$/g, '').toLowerCase()
}

export function rememberProxyCredentialsForProxy(
  proxyId: string,
  proxyString: string,
  credentials: { username: string; password: string } | undefined,
  browserSession: Electron.Session
): void {
  const parsed = parseProxy(proxyString)
  if (!parsed || !credentials) return
  const sessionCredentials = proxyCredentials.get(browserSession) ?? new Map<string, { username: string; password: string }>()
  sessionCredentials.set(proxyId, { username: credentials.username, password: credentials.password })
  proxyCredentials.set(browserSession, sessionCredentials)
  activeProxyIds.set(browserSession, proxyId)
  activeProxyEndpoints.set(browserSession, `${normalizeProxyHost(parsed.host)}:${parsed.port}`)
}

export function rememberProxyCredentials(proxyString: string, browserSession: Electron.Session): void {
  const parsed = parseProxy(proxyString)
  if (!parsed || !parsed.username) return
  const identity = `${parsed.protocol}|${parsed.hostPort}|${parsed.username}`
  rememberProxyCredentialsForProxy(identity, proxyString, {
    username: parsed.username,
    password: parsed.password || ''
  }, browserSession)
}

export function getProxyCredentials(
  browserSession: Electron.Session,
  _host: string,
  _port: string,
  proxyId?: string
): { username: string; password: string } | undefined {
  const sessionCredentials = proxyCredentials.get(browserSession)
  if (!sessionCredentials) return undefined
  const normalizedHost = normalizeProxyHost(_host)
  const activeEndpoint = activeProxyEndpoints.get(browserSession)
  if (activeEndpoint && activeEndpoint !== `${normalizedHost}:${_port}`.toLowerCase() && activeEndpoint !== `${_host}:${_port}`.toLowerCase()) {
    return undefined
  }
  const identity = proxyId ?? activeProxyIds.get(browserSession)
  if (identity) return sessionCredentials.get(identity)
  return undefined
}

export function forgetProxyCredentials(proxyString: string, browserSession: Electron.Session, proxyId?: string): void {
  const parsed = parseProxy(proxyString)
  if (!parsed) return
  const credentials = proxyCredentials.get(browserSession)
  const identity = proxyId ?? activeProxyIds.get(browserSession)
  const wasActive = activeProxyIds.get(browserSession) === identity
  if (identity) credentials?.delete(identity)
  if (credentials?.size === 0) proxyCredentials.delete(browserSession)
  if (wasActive) {
    activeProxyIds.delete(browserSession)
    activeProxyEndpoints.delete(browserSession)
  }
}

export function clearProxyCredentials(browserSession: Electron.Session): void {
  proxyCredentials.delete(browserSession)
  activeProxyIds.delete(browserSession)
  activeProxyEndpoints.delete(browserSession)
}

export function clearAllProxyCredentials(): void {
  proxyCredentials.clear()
  activeProxyIds.clear()
  activeProxyEndpoints.clear()
}
