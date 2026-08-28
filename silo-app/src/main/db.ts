import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import initSqlJs, { Database, type SqlValue } from 'sql.js'
import { atomicWriteFile } from './storage'
import { SiloError, logInternalError, migrationError, persistenceError, storageReadError } from './errors'

const SCHEMA_VERSION = 3
const PROXY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface GameRecord {
  id: string
  name: string
  url: string
  icon?: string | null
  proxy_mode?: string | null
  created_at: number
}

export interface EnvironmentRecord {
  id: string
  name: string
  partition: string
  proxy?: string | null
  account_hint?: string | null
  created_at: number
}

let db: Database
let createDatabase: (data?: Uint8Array) => Database
let legacyProxyMigrator: ((proxy: string) => string) | null = null

// The database keeps only a safe proxy identifier. This hook is registered by
// the main-process proxy store before startup migration, so old URL-bearing
// records are converted before the migrated database is persisted.
export function setLegacyProxyMigrator(migrator: ((proxy: string) => string) | null): void {
  legacyProxyMigrator = migrator
}

function getDBPath(): string {
  return join(app.getPath('userData'), 'silo.db')
}

export function partitionForEnvironment(environmentId: string): string {
  return `persist:silo-${environmentId}`
}

function tableExists(name: string): boolean {
  const stmt = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
  stmt.bind([name])
  const exists = stmt.step()
  stmt.free()
  return exists
}

function columnsForTable(name: string): Set<string> {
  const stmt = db.prepare(`PRAGMA table_info(${name})`)
  const columns = new Set<string>()
  while (stmt.step()) {
    const row = stmt.getAsObject() as { name?: unknown }
    if (typeof row.name === 'string') columns.add(row.name)
  }
  stmt.free()
  return columns
}

function createCurrentSchema(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      proxy_mode TEXT DEFAULT 'inherit',
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      partition TEXT NOT NULL UNIQUE,
      proxy TEXT,
      account_hint TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS game_environments (
      game_id TEXT NOT NULL,
      environment_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      PRIMARY KEY (game_id, environment_id),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
    )
  `)
  db.run('CREATE INDEX IF NOT EXISTS idx_game_environments_environment ON game_environments(environment_id)')
  // A relationship whose Game no longer exists cannot be safely reattached.
  // Keep the original IDs in quarantine so recovery does not require inventing
  // a Game or deleting the Environment.
  db.run(`
    CREATE TABLE IF NOT EXISTS orphaned_game_environments (
      game_id TEXT NOT NULL,
      environment_id TEXT NOT NULL,
      created_at INTEGER,
      reason TEXT NOT NULL,
      detected_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
      PRIMARY KEY (game_id, environment_id)
    )
  `)
}

function quarantineInvalidRelationships(): boolean {
  if (!tableExists('game_environments')) return false

  const stmt = db.prepare(`
    SELECT ge.game_id, ge.environment_id, ge.created_at
    FROM game_environments ge
    WHERE NOT EXISTS (SELECT 1 FROM games g WHERE g.id = ge.game_id)
       OR NOT EXISTS (SELECT 1 FROM environments e WHERE e.id = ge.environment_id)
  `)
  const invalid: Array<{ game_id: string; environment_id: string; created_at: number | null }> = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as Record<string, unknown>
    if (typeof row.game_id !== 'string' || typeof row.environment_id !== 'string') {
      stmt.free()
      throw new Error('Silo database contains malformed relationship records')
    }
    invalid.push({
      game_id: row.game_id,
      environment_id: row.environment_id,
      created_at: typeof row.created_at === 'number' ? row.created_at : null
    })
  }
  stmt.free()
  if (invalid.length === 0) return false

  db.run('BEGIN')
  try {
    for (const row of invalid) {
      db.run(
        `INSERT INTO orphaned_game_environments
          (game_id, environment_id, created_at, reason)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (game_id, environment_id) DO NOTHING`,
        [row.game_id, row.environment_id, row.created_at, 'Referenced Game or Environment no longer exists']
      )
      db.run('DELETE FROM game_environments WHERE game_id = ? AND environment_id = ?', [row.game_id, row.environment_id])
    }
    db.run('COMMIT')
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } catch {
      // The original migration error is the actionable failure.
    }
    throw error
  }

  console.warn(
    `Preserved ${invalid.length} orphaned Game-Environment relationship(s) in quarantine; no Environment data was deleted.`
  )
  return true
}

function migrateLegacyEnvironmentTable(): void {
  if (!tableExists('environments')) {
    createCurrentSchema()
    return
  }
  const columns = columnsForTable('environments')
  if (!columns.has('game_id')) {
    createCurrentSchema()
    return
  }

  // Preserve every legacy environment once, and retain its old association as
  // an initial usage link. Do not duplicate browser identities per game.
  db.run('BEGIN')
  try {
    db.run('PRAGMA foreign_keys = OFF')
    db.run('ALTER TABLE environments RENAME TO environments_legacy')
    createCurrentSchema()

    const legacyColumns = columnsForTable('environments_legacy')
    const proxyColumn = legacyColumns.has('proxy') ? 'proxy' : 'NULL AS proxy'
    const legacy = db.prepare(`SELECT id, name, partition, ${proxyColumn}, created_at FROM environments_legacy`)
    const rows: Array<{ id: string; name: string; partition: string; proxy: string | null; created_at: number }> = []
    const rowsById = new Map<string, (typeof rows)[number]>()
    while (legacy.step()) {
      const row = legacy.getAsObject() as Record<string, unknown>
      if (
        typeof row.id !== 'string' ||
        typeof row.name !== 'string' ||
        typeof row.partition !== 'string' ||
        typeof row.created_at !== 'number'
      ) {
        throw new Error('Cannot migrate an invalid legacy environment record')
      }
      const expectedPartition = partitionForEnvironment(row.id)
      if (row.partition !== expectedPartition) {
        throw new Error(
          `Cannot migrate environment ${row.id}: stored partition does not match its stable identity`
        )
      }
      const migratedRow = {
        id: row.id,
        name: row.name,
        partition: row.partition,
        proxy: typeof row.proxy === 'string' ? row.proxy : null,
        created_at: row.created_at
      }
      const previous = rowsById.get(migratedRow.id)
      if (previous) {
        if (JSON.stringify(previous) !== JSON.stringify(migratedRow)) {
          throw new Error(`Cannot migrate conflicting legacy records for environment ${migratedRow.id}`)
        }
      } else {
        rowsById.set(migratedRow.id, migratedRow)
        rows.push(migratedRow)
      }
    }
    legacy.free()
    for (const row of rows) {
      db.run(
        'INSERT INTO environments (id, name, partition, proxy, created_at) VALUES (?, ?, ?, ?, ?)',
        [row.id, row.name, row.partition, row.proxy, row.created_at]
      )
    }

    const links = db.prepare('SELECT game_id, id, created_at FROM environments_legacy')
    while (links.step()) {
      const row = links.getAsObject() as Record<string, unknown>
      if (typeof row.game_id !== 'string' || typeof row.id !== 'string') {
        throw new Error('Cannot migrate an invalid legacy environment association')
      }
      const game = db.prepare('SELECT 1 FROM games WHERE id = ?')
      game.bind([row.game_id])
      const gameExists = game.step()
      game.free()
      if (!gameExists) {
        // The environment is still valuable and is copied above. Its old
        // dangling association cannot be reconstructed without inventing a
        // game, so preserve the identity and report the recoverable action.
        console.warn(
          `Migrated environment ${row.id} without its missing legacy game association; attach it to a game to use it`
        )
        continue
      }
      db.run(
        'INSERT OR IGNORE INTO game_environments (game_id, environment_id, created_at) VALUES (?, ?, ?)',
        [row.game_id, row.id, typeof row.created_at === 'number' ? row.created_at : Math.floor(Date.now() / 1000)]
      )
    }
    links.free()
    db.run('DROP TABLE environments_legacy')
    db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`)
    db.run('PRAGMA foreign_keys = ON')
    db.run('COMMIT')
  } catch (error) {
    try {
      db.run('ROLLBACK')
    } finally {
      db.run('PRAGMA foreign_keys = ON')
    }
    throw error
  }
}

function ensureSchema(): boolean {
  const versionStmt = db.prepare('PRAGMA user_version')
  versionStmt.step()
  const version = Number((versionStmt.getAsObject() as { user_version?: unknown }).user_version ?? 0)
  versionStmt.free()

  if (version > SCHEMA_VERSION) {
    throw new SiloError('MIGRATION_FAILED', `Silo database schema version ${version} is newer than this application supports.`)
  }

  // Version 0/1 databases may still have the Phase 1 legacy table shape.
  // This migration is deterministic and transaction-protected.
  const hadLegacyEnvironmentTable = tableExists('environments') && columnsForTable('environments').has('game_id')
  migrateLegacyEnvironmentTable()
  createCurrentSchema()
  const gameColumns = columnsForTable('games')
  if (!gameColumns.has('proxy_mode')) {
    db.run("ALTER TABLE games ADD COLUMN proxy_mode TEXT DEFAULT 'inherit'")
    db.run("UPDATE games SET proxy_mode = 'inherit' WHERE proxy_mode IS NULL")
  }
  const columns = columnsForTable('environments')
  if (columns.has('game_id')) throw new Error('Silo database migration did not remove environments.game_id')
  if (!columns.has('partition')) throw new Error('Silo database is missing environment partition data')
  const hadMissingAccountHint = !columns.has('account_hint')
  if (hadMissingAccountHint) {
    db.run('ALTER TABLE environments ADD COLUMN account_hint TEXT')
  }
  const quarantinedRelationships = quarantineInvalidRelationships()
  if (version < SCHEMA_VERSION) db.run(`PRAGMA user_version = ${SCHEMA_VERSION}`)
  db.run('PRAGMA foreign_keys = ON')
  const foreignKeyCheck = db.exec('PRAGMA foreign_key_check')
  if (foreignKeyCheck.length > 0 && foreignKeyCheck[0].values.length > 0) {
    throw new Error('Silo database contains invalid relationship records after recovery')
  }
  return version < SCHEMA_VERSION || hadLegacyEnvironmentTable || quarantinedRelationships || hadMissingAccountHint
}

export async function initDB(): Promise<void> {
  const SQL = await initSqlJs()
  createDatabase = (data) => new SQL.Database(data)
  const dbPath = getDBPath()
  const backupPath = `${dbPath}.bak`
  let recoveredFromBackup = false
  if (existsSync(dbPath)) {
    try {
      db = new SQL.Database(readFileSync(dbPath))
      // sql.js may defer rejecting corrupt bytes until the first query.
      db.exec('PRAGMA user_version')
    } catch (error) {
      try {
        db?.close()
      } catch {
        // The candidate may not have been constructed successfully.
      }
      if (!existsSync(backupPath)) throw storageReadError('the Silo database', error)
      try {
        db = new SQL.Database(readFileSync(backupPath))
        db.exec('PRAGMA user_version')
        recoveredFromBackup = true
        console.warn('The primary Silo database was unreadable; a valid backup will be restored.')
      } catch (backupError) {
        throw storageReadError('the Silo database or its backup', backupError)
      }
    }
  } else if (existsSync(backupPath)) {
    try {
      db = new SQL.Database(readFileSync(backupPath))
      db.exec('PRAGMA user_version')
      recoveredFromBackup = true
      console.warn('The primary Silo database was missing; a valid backup will be restored.')
    } catch (error) {
      throw storageReadError('the Silo database backup', error)
    }
  } else {
    db = new SQL.Database()
  }
  try {
    const schemaChanged = ensureSchema()
    let proxyReferencesChanged = false
    if (legacyProxyMigrator) {
      const environments = getAllEnvironments()
      for (const environment of environments) {
        if (!environment.proxy || !environment.proxy.includes('://')) continue
        const proxyId = legacyProxyMigrator(environment.proxy)
        if (proxyId !== environment.proxy) {
          setEnvironmentProxy(environment.id, proxyId)
          proxyReferencesChanged = true
        }
      }
    }
    // Re-persist a database recovered from backup, and persist a newly created
    // schema. A migration failure never reaches this point.
    if (recoveredFromBackup || !existsSync(dbPath) || schemaChanged || proxyReferencesChanged) persist(recoveredFromBackup)
  } catch (error) {
    if (error instanceof SiloError) throw error
    throw migrationError(error)
  }
}

export function persist(preserveBackup = false): void {
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    const dbPath = getDBPath()
    atomicWriteFile(dbPath, buffer, { backupPath: `${dbPath}.bak`, preserveBackup })
  } catch (error) {
    throw persistenceError('the Silo database', error)
  }
}

function restoreSnapshot(snapshot: Uint8Array): void {
  if (!createDatabase) throw new Error('Database is not initialized')
  db.close()
  db = createDatabase(snapshot)
  db.run('PRAGMA foreign_keys = ON')
}

function commitMutation(mutation: () => void): void {
  const snapshot = db.export()
  try {
    mutation()
    persist()
  } catch (error) {
    try {
      restoreSnapshot(snapshot)
    } catch (restoreError) {
      logInternalError('Failed to restore the in-memory database after a failed mutation:', restoreError)
    }
    throw error
  }
}

function readRows<T extends object>(sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: T[] = []
  while (stmt.step()) rows.push(stmt.getAsObject() as T)
  stmt.free()
  return rows
}

function requireGame(id: string): GameRecord {
  const game = getGameById(id)
  if (!game) throw new SiloError('NOT_FOUND', 'Game not found.')
  return game
}

function requireEnvironment(id: string): EnvironmentRecord {
  const environment = getEnvironmentById(id)
  if (!environment) throw new SiloError('NOT_FOUND', 'Environment not found.')
  return environment
}

function validateProxyReference(proxy: string | null): string | null {
  if (proxy === null) return null
  if (!PROXY_ID_PATTERN.test(proxy)) throw new SiloError('INVALID_REQUEST', 'Environment proxy must reference a configured proxy.')
  return proxy
}

export function getGames(): GameRecord[] {
  return readRows<GameRecord>('SELECT * FROM games ORDER BY created_at ASC')
}

export function createGame(id: string, name: string, url: string): void {
  commitMutation(() => db.run('INSERT INTO games (id, name, url, proxy_mode) VALUES (?, ?, ?, ?)', [id, name, url, 'inherit']))
}

export function getGameById(id: string): GameRecord | null {
  return readRows<GameRecord>('SELECT * FROM games WHERE id = ?', [id])[0] ?? null
}

export function setGameProxyMode(id: string, mode: string): void {
  requireGame(id)
  if (!['inherit', 'smart', 'full'].includes(mode)) throw new SiloError('INVALID_REQUEST', 'Invalid proxy mode.')
  commitMutation(() => db.run('UPDATE games SET proxy_mode = ? WHERE id = ?', [mode, id]))
}

export function getGameProxyMode(id: string): string | null {
  return getGameById(id)?.proxy_mode ?? null
}

export function renameGame(id: string, name: string): void {
  requireGame(id)
  commitMutation(() => db.run('UPDATE games SET name = ? WHERE id = ?', [name, id]))
}

export function deleteGame(id: string): void {
  requireGame(id)
  commitMutation(() => db.run('DELETE FROM games WHERE id = ?', [id]))
}

export function getEnvironments(gameId: string): EnvironmentRecord[] {
  requireGame(gameId)
  return readRows<EnvironmentRecord>(
    `SELECT e.* FROM environments e
       INNER JOIN game_environments ge ON ge.environment_id = e.id
      WHERE ge.game_id = ? ORDER BY e.created_at ASC`,
    [gameId]
  )
}

export function getAllEnvironments(): EnvironmentRecord[] {
  return readRows<EnvironmentRecord>('SELECT * FROM environments ORDER BY created_at ASC')
}

export function getEnvironmentById(id: string): EnvironmentRecord | null {
  return readRows<EnvironmentRecord>('SELECT * FROM environments WHERE id = ?', [id])[0] ?? null
}

export function createEnvironment(
  id: string,
  gameId: string,
  name: string,
  partition: string,
  proxy: string | null,
  accountHint: string | null = null
): void {
  requireGame(gameId)
  if (partition !== partitionForEnvironment(id)) throw new Error('Invalid environment partition')
  const proxyReference = validateProxyReference(proxy)
  const normalizedHint = accountHint === null ? null : accountHint.trim().length === 0 ? null : accountHint.trim().slice(0, 64)
  commitMutation(() => {
    db.run('BEGIN')
    try {
      db.run('INSERT INTO environments (id, name, partition, proxy, account_hint) VALUES (?, ?, ?, ?, ?)', [id, name, partition, proxyReference, normalizedHint])
      db.run('INSERT INTO game_environments (game_id, environment_id) VALUES (?, ?)', [gameId, id])
      db.run('COMMIT')
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  })
}

export function attachEnvironmentToGame(gameId: string, environmentId: string): void {
  requireGame(gameId)
  requireEnvironment(environmentId)
  commitMutation(() => db.run('INSERT OR IGNORE INTO game_environments (game_id, environment_id) VALUES (?, ?)', [gameId, environmentId]))
}

export function renameEnvironment(id: string, name: string): void {
  requireEnvironment(id)
  commitMutation(() => db.run('UPDATE environments SET name = ? WHERE id = ?', [name, id]))
}

export function setEnvironmentProxy(id: string, proxy: string | null): void {
  requireEnvironment(id)
  const proxyReference = validateProxyReference(proxy)
  commitMutation(() => db.run('UPDATE environments SET proxy = ? WHERE id = ?', [proxyReference, id]))
}

export function setEnvironmentAccountHint(id: string, accountHint: string | null): void {
  requireEnvironment(id)
  const normalized = accountHint === null ? null : accountHint.trim().length === 0 ? null : accountHint.trim().slice(0, 64)
  commitMutation(() => db.run('UPDATE environments SET account_hint = ? WHERE id = ?', [normalized, id]))
}

export function getEnvironmentAccountHint(id: string): string | null {
  const env = getEnvironmentById(id)
  return env?.account_hint ?? null
}

export function getEnvironmentPartition(id: string): string | null {
  const environment = getEnvironmentById(id)
  if (!environment) return null
  const expected = partitionForEnvironment(id)
  if (environment.partition !== expected) throw new Error('Environment partition identity is invalid')
  return expected
}

export function deleteEnvironment(id: string): void {
  requireEnvironment(id)
  commitMutation(() => db.run('DELETE FROM environments WHERE id = ?', [id]))
}
