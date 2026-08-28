import { app, safeStorage } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { atomicWriteFile } from './storage'
import { SiloError, persistenceError, storageReadError } from './errors'
import { parseProxy, type ParsedProxy } from './smartProxy'

export interface ProxyMetadata {
  id: string
  label: string
  protocol: 'socks5' | 'socks4' | 'http'
  host: string
  port: string
  color: string
  authenticated: boolean
}

export interface ProxyInput {
  label: string
  address: string
  color: string
  id?: string
}

export interface MainProxyConfig {
  metadata: ProxyMetadata
  proxyRules: string
  username?: string
  password?: string
}

interface StoredCredential {
  username: string
  password: string
}

interface StoredMetadata extends ProxyMetadata {
  // Only accepted while reading/migrating legacy files. It is never written.
  value?: string
}

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PROTOCOLS = new Set(['socks5', 'socks4', 'http'])
const MAX_ENTRIES = 50
const MAX_LABEL_LENGTH = 50
const MAX_ADDRESS_LENGTH = 300
const MAX_CREDENTIAL_LENGTH = 512

let loadedForPath: string | null = null
let metadata = new Map<string, ProxyMetadata>()
let credentials = new Map<string, StoredCredential>()
const legacyAddressIds = new Map<string, string>()

function proxyPath(): string {
  return join(app.getPath('userData'), 'proxies.json')
}

function credentialPath(): string {
  return join(app.getPath('userData'), 'proxy-credentials.json')
}

function encryptionAvailable(): boolean {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

function requireEncryption(): void {
  if (!encryptionAvailable()) {
    throw new SiloError('STORAGE_READ_FAILED', 'Secure proxy credential storage is unavailable on this device.')
  }
}

function requireId(value: unknown): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) throw new SiloError('INVALID_REQUEST', 'Invalid proxy identifier.')
  return value
}

function normalizeParsed(parsed: ParsedProxy): { protocol: 'socks5' | 'socks4' | 'http'; host: string; port: string } {
  if (!PROTOCOLS.has(parsed.protocol)) throw new SiloError('INVALID_REQUEST', 'Invalid proxy configuration.')
  return { protocol: parsed.protocol as 'socks5' | 'socks4' | 'http', host: parsed.host, port: parsed.port }
}

function proxyRulesFor(entry: Pick<ProxyMetadata, 'protocol' | 'host' | 'port'>): string {
  return `${entry.protocol}://${entry.host}:${entry.port}`
}

function validateAddress(address: unknown): { parsed: ParsedProxy; safe: { protocol: 'socks5' | 'socks4' | 'http'; host: string; port: string } } {
  if (typeof address !== 'string' || address.trim().length === 0 || address.length > MAX_ADDRESS_LENGTH) {
    throw new SiloError('INVALID_REQUEST', 'Invalid proxy configuration.')
  }
  const parsed = parseProxy(address.trim())
  if (!parsed || !PROTOCOLS.has(parsed.protocol)) throw new SiloError('INVALID_REQUEST', 'Invalid proxy configuration.')
  if ((parsed.username && parsed.username.length > MAX_CREDENTIAL_LENGTH) || (parsed.password && parsed.password.length > MAX_CREDENTIAL_LENGTH)) {
    throw new SiloError('INVALID_REQUEST', 'Invalid proxy credentials.')
  }
  if (!parsed.username && parsed.password) {
    // A password without an account name is not a valid proxy credential.
    throw new SiloError('INVALID_REQUEST', 'Invalid proxy credentials.')
  }
  return { parsed, safe: normalizeParsed(parsed) }
}

function metadataFor(id: string, label: string, color: string, parsed: ParsedProxy): ProxyMetadata {
  const safe = normalizeParsed(parsed)
  return {
    id,
    label,
    ...safe,
    color,
    authenticated: Boolean(parsed.username)
  }
}

function validateLegacyMetadata(value: unknown): StoredMetadata {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid proxy metadata')
  const entry = value as Record<string, unknown>
  if (
    typeof entry.id !== 'string' || !ID_PATTERN.test(entry.id) ||
    typeof entry.label !== 'string' || !entry.label.trim() || entry.label.trim().length > MAX_LABEL_LENGTH ||
    typeof entry.value !== 'string' || entry.value.trim().length > MAX_ADDRESS_LENGTH ||
    typeof entry.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(entry.color)
  ) throw new Error('Invalid proxy metadata')
  const { parsed } = validateAddress(entry.value.trim())
  return { ...metadataFor(entry.id, entry.label.trim(), entry.color, parsed), value: entry.value.trim() }
}

function validateSafeMetadata(value: unknown): ProxyMetadata {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid proxy metadata')
  const entry = value as Record<string, unknown>
  if (
    typeof entry.id !== 'string' || !ID_PATTERN.test(entry.id) ||
    typeof entry.label !== 'string' || !entry.label.trim() || entry.label.trim().length > MAX_LABEL_LENGTH ||
    typeof entry.protocol !== 'string' || !PROTOCOLS.has(entry.protocol) ||
    typeof entry.host !== 'string' || !entry.host || entry.host.length > 255 ||
    typeof entry.port !== 'string' || !/^\d+$/.test(entry.port) || Number(entry.port) < 1 || Number(entry.port) > 65535 ||
    typeof entry.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(entry.color)
  ) throw new Error('Invalid proxy metadata')
  return {
    id: entry.id,
    label: entry.label.trim(),
    protocol: entry.protocol as ProxyMetadata['protocol'],
    host: entry.host,
    port: entry.port,
    color: entry.color,
    authenticated: Boolean(entry.authenticated)
  }
}

function readJsonCandidate(path: string): unknown {
  const backupPath = `${path}.bak`
  const sourcePath = existsSync(path) ? path : backupPath
  if (!existsSync(sourcePath)) return null
  try {
    return JSON.parse(readFileSync(sourcePath, 'utf8')) as unknown
  } catch (error) {
    if (!existsSync(backupPath) || sourcePath === backupPath) throw storageReadError('proxy settings or its backup', error)
    try {
      return JSON.parse(readFileSync(backupPath, 'utf8')) as unknown
    } catch (backupError) {
      throw storageReadError('proxy settings or its backup', backupError)
    }
  }
}

function decryptLegacyEntries(envelope: Record<string, unknown>): unknown {
  if (typeof envelope.payload !== 'string') throw new Error('Invalid encrypted proxy settings')
  requireEncryption()
  return JSON.parse(safeStorage.decryptString(Buffer.from(envelope.payload, 'base64'))) as unknown
}

function readCredentialEnvelope(): Map<string, StoredCredential> {
  const path = credentialPath()
  const source = readJsonCandidate(path)
  if (source === null) return new Map()
  if (typeof source !== 'object' || source === null || Array.isArray(source)) throw storageReadError('secure proxy credentials', new Error('Invalid credential store'))
  const envelope = source as Record<string, unknown>
  if (envelope.encrypted !== true || typeof envelope.payload !== 'string') throw storageReadError('secure proxy credentials', new Error('Unsupported credential store'))
  requireEncryption()
  let decoded: unknown
  try {
    decoded = JSON.parse(safeStorage.decryptString(Buffer.from(envelope.payload, 'base64'))) as unknown
  } catch (error) {
    throw storageReadError('secure proxy credentials', error)
  }
  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) throw storageReadError('secure proxy credentials', new Error('Invalid credential data'))
  const result = new Map<string, StoredCredential>()
  for (const [id, raw] of Object.entries(decoded as Record<string, unknown>)) {
    if (!ID_PATTERN.test(id) || typeof raw !== 'object' || raw === null) throw storageReadError('secure proxy credentials', new Error('Invalid credential data'))
    const value = raw as Record<string, unknown>
    if (typeof value.username !== 'string' || typeof value.password !== 'string' || value.username.length > MAX_CREDENTIAL_LENGTH || value.password.length > MAX_CREDENTIAL_LENGTH) {
      throw storageReadError('secure proxy credentials', new Error('Invalid credential data'))
    }
    result.set(id, { username: value.username, password: value.password })
  }
  return result
}

function safeMetadataContents(entries: Iterable<ProxyMetadata>): string {
  return JSON.stringify({ version: 2, entries: [...entries] }, null, 2)
}

function credentialContents(values: Map<string, StoredCredential>): string {
  requireEncryption()
  const plain = Object.fromEntries(values.entries())
  const payload = safeStorage.encryptString(JSON.stringify(plain)).toString('base64')
  return JSON.stringify({ version: 1, encrypted: true, payload }, null, 2)
}

function persistStore(nextMetadata: Map<string, ProxyMetadata>, nextCredentials: Map<string, StoredCredential>): void {
  const metadataPath = proxyPath()
  const credentialPathValue = credentialPath()
  try {
    if (nextCredentials.size > 0) atomicWriteFile(credentialPathValue, credentialContents(nextCredentials), { backupPath: `${credentialPathValue}.bak` })
    else if (existsSync(credentialPathValue)) atomicWriteFile(credentialPathValue, credentialContents(nextCredentials), { backupPath: `${credentialPathValue}.bak` })
    atomicWriteFile(metadataPath, safeMetadataContents(nextMetadata.values()), { backupPath: `${metadataPath}.bak` })
  } catch (error) {
    throw persistenceError('proxy settings', error)
  }
}

function loadPoolSource(): { entries: ProxyMetadata[]; legacy: boolean; legacyAddresses: Map<string, string> } {
  const source = readJsonCandidate(proxyPath())
  if (source === null) return { entries: [], legacy: false, legacyAddresses: new Map() }
  let decoded: unknown = source
  if (Array.isArray(source)) return migrateLegacyPool(source)
  if (typeof source !== 'object' || source === null) throw storageReadError('proxy settings', new Error('Invalid proxy settings'))
  const envelope = source as Record<string, unknown>
  if (envelope.encrypted === true) decoded = decryptLegacyEntries(envelope)
  else if (envelope.encrypted === false && 'entries' in envelope) decoded = envelope.entries
  else if (Array.isArray(envelope.entries)) decoded = envelope.entries
  else throw storageReadError('proxy settings', new Error('Unsupported proxy settings'))
  if (!Array.isArray(decoded)) throw storageReadError('proxy settings', new Error('Invalid proxy settings'))
  const hasLegacyValues = decoded.some((entry) => typeof entry === 'object' && entry !== null && 'value' in (entry as object))
  return hasLegacyValues ? migrateLegacyPool(decoded) : { entries: decoded.map(validateSafeMetadata), legacy: false, legacyAddresses: new Map() }
}

function migrateLegacyPool(rawEntries: unknown[]): { entries: ProxyMetadata[]; legacy: boolean; legacyAddresses: Map<string, string> } {
  if (rawEntries.length > MAX_ENTRIES) throw storageReadError('proxy settings', new Error('Too many proxy entries'))
  const ids = new Set<string>()
  const result: ProxyMetadata[] = []
  const addresses = new Map<string, string>()
  for (const raw of rawEntries) {
    const legacy = validateLegacyMetadata(raw)
    if (ids.has(legacy.id)) throw storageReadError('proxy settings', new Error('Duplicate proxy identifier'))
    ids.add(legacy.id)
    const { value: legacyAddress, ...safeMetadata } = legacy
    result.push(safeMetadata)
    addresses.set(legacyAddress!, legacy.id)
  }
  return { entries: result, legacy: true, legacyAddresses: addresses }
}

function ensureLoaded(): void {
  const currentPath = app.getPath('userData')
  if (loadedForPath === currentPath) return
  const pool = loadPoolSource()
  const nextMetadata = new Map(pool.entries.map((entry) => [entry.id, entry]))
  const nextCredentials = readCredentialEnvelope()
  // Legacy pool files carry credentials inside the old value field. Move them
  // into the encrypted store before replacing either plaintext file.
  if (pool.legacy) {
    const legacySource = readJsonCandidate(proxyPath())
    let decoded: unknown = legacySource
    if (typeof legacySource === 'object' && legacySource !== null && !Array.isArray(legacySource)) {
      const envelope = legacySource as Record<string, unknown>
      if (envelope.encrypted === true) decoded = decryptLegacyEntries(envelope)
      else if ('entries' in envelope) decoded = envelope.entries
    }
    for (const raw of decoded as unknown[]) {
      const legacy = validateLegacyMetadata(raw)
      const parsed = parseProxy(legacy.value!)!
      if (parsed.username) {
        requireEncryption()
        nextCredentials.set(legacy.id, { username: parsed.username, password: parsed.password || '' })
      }
    }
    persistStore(nextMetadata, nextCredentials)
  } else {
    for (const id of nextCredentials.keys()) if (!nextMetadata.has(id)) nextCredentials.delete(id)
    // Rewriting an already-safe pool also repairs a stale/legacy backup and
    // guarantees that proxies.json.bak cannot retain an old plaintext copy.
    if (existsSync(proxyPath()) || existsSync(`${proxyPath()}.bak`)) persistStore(nextMetadata, nextCredentials)
  }
  for (const [address, id] of pool.legacyAddresses) legacyAddressIds.set(address, id)
  metadata = nextMetadata
  credentials = nextCredentials
  loadedForPath = currentPath
}

export function initializeProxyStore(): void {
  ensureLoaded()
}

export function listProxyMetadata(): ProxyMetadata[] {
  ensureLoaded()
  return [...metadata.values()].map((entry) => ({ ...entry, authenticated: credentials.has(entry.id) }))
}

export function getProxyConfig(id: string): MainProxyConfig | null {
  ensureLoaded()
  const entry = metadata.get(id)
  if (!entry) return null
  const credential = credentials.get(id)
  return {
    metadata: { ...entry, authenticated: Boolean(credential) },
    proxyRules: proxyRulesFor(entry),
    ...(credential ? { username: credential.username, password: credential.password } : {})
  }
}

export function addProxy(input: ProxyInput): ProxyMetadata {
  ensureLoaded()
  const id = input.id ?? randomUUID()
  requireId(id)
  if (typeof input.label !== 'string' || !input.label.trim() || input.label.trim().length > MAX_LABEL_LENGTH) throw new SiloError('INVALID_REQUEST', 'Invalid proxy label.')
  if (typeof input.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(input.color)) throw new SiloError('INVALID_REQUEST', 'Invalid proxy color.')
  const { parsed } = validateAddress(input.address)
  const nextMetadata = new Map(metadata)
  const nextCredentials = new Map(credentials)
  const safe = metadataFor(id, input.label.trim(), input.color, parsed)
  nextMetadata.set(id, safe)
  if (parsed.username) {
    requireEncryption()
    nextCredentials.set(id, { username: parsed.username, password: parsed.password || '' })
  } else {
    nextCredentials.delete(id)
  }
  persistStore(nextMetadata, nextCredentials)
  metadata = nextMetadata
  credentials = nextCredentials
  legacyAddressIds.set(input.address.trim(), id)
  return { ...safe, authenticated: Boolean(parsed.username) }
}

export function replaceProxyMetadata(rawEntries: unknown): void {
  ensureLoaded()
  if (!Array.isArray(rawEntries) || rawEntries.length > MAX_ENTRIES) throw new SiloError('INVALID_REQUEST', 'Invalid proxy list.')
  const nextMetadata = new Map<string, ProxyMetadata>()
  for (const raw of rawEntries) {
    const entry = validateSafeMetadata(raw)
    if (nextMetadata.has(entry.id)) throw new SiloError('INVALID_REQUEST', 'Invalid proxy list.')
    if (!metadata.has(entry.id)) throw new SiloError('INVALID_REQUEST', 'Unknown proxy identifier.')
    nextMetadata.set(entry.id, entry)
  }
  const nextCredentials = new Map([...credentials].filter(([id]) => nextMetadata.has(id)))
  persistStore(nextMetadata, nextCredentials)
  metadata = nextMetadata
  credentials = nextCredentials
}

export function removeProxy(id: string): void {
  ensureLoaded()
  requireId(id)
  if (!metadata.has(id)) throw new SiloError('NOT_FOUND', 'Proxy not found.')
  const nextMetadata = new Map(metadata)
  const nextCredentials = new Map(credentials)
  nextMetadata.delete(id)
  nextCredentials.delete(id)
  persistStore(nextMetadata, nextCredentials)
  metadata = nextMetadata
  credentials = nextCredentials
  for (const [address, addressId] of legacyAddressIds) if (addressId === id) legacyAddressIds.delete(address)
}

export function proxyIdForLegacyAddress(address: string): string {
  ensureLoaded()
  const existing = legacyAddressIds.get(address.trim())
  if (existing && metadata.has(existing)) return existing
  const parsed = parseProxy(address.trim())
  if (!parsed || !PROTOCOLS.has(parsed.protocol)) throw new SiloError('MIGRATION_FAILED', 'Silo could not safely migrate a proxy configuration.')
  const id = randomUUID()
  const color = '#60a5fa'
  addProxy({ id, label: `Migrated proxy ${metadata.size + 1}`, address: address.trim(), color })
  legacyAddressIds.set(address.trim(), id)
  return id
}

export function resetProxyStoreForTests(): void {
  loadedForPath = null
  metadata = new Map()
  credentials = new Map()
  legacyAddressIds.clear()
}
