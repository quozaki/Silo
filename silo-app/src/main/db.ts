import { app, session } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs'
import initSqlJs, { Database } from 'sql.js'

let db: Database

function getDBPath(): string {
  return join(app.getPath('userData'), 'silo.db')
}

export async function initDB(): Promise<void> {
  const SQL = await initSqlJs()
  const DB_PATH = getDBPath()

  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS environments (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      partition TEXT NOT NULL,
      proxy TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `)

  // sql.js does not enforce FKs unless this is on for every connection
  db.run('PRAGMA foreign_keys = ON')

  // Migrate: add proxy column if it doesn't exist yet
  try {
    db.run('ALTER TABLE environments ADD COLUMN proxy TEXT')
  } catch {
    // Column already exists
  }

  // Cleanup: remove auto-seeded games from earlier versions so first launch is empty
  // Only deletes the exact seeded pair (name + url match) to avoid deleting user-created games
  try {
    const seeded = [
      { name: 'Strategy Combat', url: 'https://www.strategycombat.com' },
      { name: 'Global Base Combat', url: 'https://www.globalbasecombat.com' }
    ]
    for (const g of seeded) {
      const stmt = db.prepare('SELECT id FROM games WHERE name = ? AND url = ?')
      stmt.bind([g.name, g.url])
      const ids: string[] = []
      while (stmt.step()) {
        const row = stmt.getAsObject() as { id?: unknown }
        if (typeof row.id === 'string') ids.push(row.id)
      }
      stmt.free()
      for (const id of ids) {
        // Collect partitions to clear Chromium storage
        const pStmt = db.prepare('SELECT partition FROM environments WHERE game_id = ?')
        pStmt.bind([id])
        const partitions: string[] = []
        while (pStmt.step()) {
          const row = pStmt.getAsObject() as { partition?: unknown }
          if (typeof row.partition === 'string') partitions.push(row.partition)
        }
        pStmt.free()
        db.run('DELETE FROM environments WHERE game_id = ?', [id])
        db.run('DELETE FROM games WHERE id = ?', [id])
        // Clear isolated storage for those partitions (best effort)
        for (const p of partitions) {
          try {
            await session
              .fromPartition(p)
              .clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb'] })
          } catch {
            // ignore
          }
        }
      }
    }
  } catch (e) {
    console.error('Seed cleanup failed:', e)
  }

  persist()
}

export function persist(): void {
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    const DB_PATH = getDBPath()
    const dir = app.getPath('userData')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const tmpPath = `${DB_PATH}.tmp`
    writeFileSync(tmpPath, buffer)
    renameSync(tmpPath, DB_PATH)
  } catch (err) {
    console.error('Failed to persist DB:', err)
  }
}

export function getGames(): object[] {
  const stmt = db.prepare('SELECT * FROM games ORDER BY created_at ASC')
  const rows: object[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

export function createGame(id: string, name: string, url: string): void {
  db.run('INSERT INTO games (id, name, url) VALUES (?, ?, ?)', [id, name, url])
  persist()
}

export function renameGame(id: string, name: string): void {
  db.run('UPDATE games SET name = ? WHERE id = ?', [name, id])
  persist()
}

export function deleteGame(id: string): string[] {
  const stmt = db.prepare('SELECT partition FROM environments WHERE game_id = ?')
  stmt.bind([id])
  const partitions: string[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    if (typeof row.partition === 'string') partitions.push(row.partition)
  }
  stmt.free()

  db.run('DELETE FROM environments WHERE game_id = ?', [id])
  db.run('DELETE FROM games WHERE id = ?', [id])
  persist()
  return partitions
}

export function getEnvironments(gameId: string): object[] {
  const stmt = db.prepare('SELECT * FROM environments WHERE game_id = ? ORDER BY created_at ASC')
  stmt.bind([gameId])
  const rows: object[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

export function getAllEnvironments(): object[] {
  const stmt = db.prepare('SELECT * FROM environments ORDER BY created_at ASC')
  const rows: object[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

export function createEnvironment(
  id: string,
  gameId: string,
  name: string,
  partition: string,
  proxy: string | null
): void {
  const gStmt = db.prepare('SELECT id FROM games WHERE id = ?')
  gStmt.bind([gameId])
  const hasGame = gStmt.step()
  gStmt.free()
  if (!hasGame) throw new Error('Game not found for environment')
  db.run('INSERT INTO environments (id, game_id, name, partition, proxy) VALUES (?, ?, ?, ?, ?)', [
    id,
    gameId,
    name,
    partition,
    proxy
  ])
  persist()
}

export function renameEnvironment(id: string, name: string): void {
  db.run('UPDATE environments SET name = ? WHERE id = ?', [name, id])
  persist()
}

export function setEnvironmentProxy(id: string, proxy: string | null): void {
  db.run('UPDATE environments SET proxy = ? WHERE id = ?', [proxy, id])
  persist()
}

export function getEnvironmentPartition(id: string): string | null {
  const stmt = db.prepare('SELECT partition FROM environments WHERE id = ?')
  stmt.bind([id])
  let partition: string | null = null
  if (stmt.step()) {
    const row = stmt.getAsObject() as { partition?: unknown }
    if (typeof row.partition === 'string') partition = row.partition
  }
  stmt.free()
  return partition
}

export function deleteEnvironment(id: string): string | null {
  const stmt = db.prepare('SELECT partition FROM environments WHERE id = ?')
  stmt.bind([id])
  let partition: string | null = null
  if (stmt.step()) {
    const row = stmt.getAsObject()
    if (typeof row.partition === 'string') partition = row.partition
  }
  stmt.free()

  db.run('DELETE FROM environments WHERE id = ?', [id])
  persist()
  return partition
}
