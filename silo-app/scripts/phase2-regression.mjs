import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { app, BrowserWindow, session } from 'electron'

/* eslint-disable @typescript-eslint/explicit-function-return-type */

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const waitFor = async (condition, timeout = 5000) => {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    if (condition()) return
    await wait(50)
  }
  throw new Error('Timed out waiting for test condition')
}

async function createLegacyDatabase(path, { invalidPartition = false } = {}) {
  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs()
  const legacy = new SQL.Database()
  legacy.run(`
    CREATE TABLE games (id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, icon TEXT, created_at INTEGER)
  `)
  legacy.run(`
    CREATE TABLE environments (
      id TEXT PRIMARY KEY, game_id TEXT NOT NULL, name TEXT NOT NULL,
      partition TEXT NOT NULL, proxy TEXT, created_at INTEGER
    )
  `)
  legacy.run('INSERT INTO games (id, name, url, created_at) VALUES (?, ?, ?, ?)', [
    '11111111-1111-4111-8111-111111111111', 'Legacy game', 'https://legacy.example.com', 1
  ])
  legacy.run('INSERT INTO environments (id, game_id, name, partition, proxy, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
    '22222222-2222-4222-8222-222222222222',
    invalidPartition ? '11111111-1111-4111-8111-111111111111' : '11111111-1111-4111-8111-111111111111',
    'Legacy environment',
    invalidPartition ? 'persist:silo-wrong' : 'persist:silo-22222222-2222-4222-8222-222222222222',
    null,
    2
  ])
  if (!invalidPartition) {
    legacy.run('INSERT INTO environments (id, game_id, name, partition, proxy, created_at) VALUES (?, ?, ?, ?, ?, ?)', [
      '77777777-7777-4777-8777-777777777777', '99999999-9999-4999-8999-999999999999',
      'Orphan environment', 'persist:silo-77777777-7777-4777-8777-777777777777', null, 3
    ])
  }
  writeFileSync(path, Buffer.from(legacy.export()))
  legacy.close()
}

async function createCurrentOrphanDatabase(path) {
  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs()
  const current = new SQL.Database()
  current.run('PRAGMA foreign_keys = OFF')
  current.run(`
    CREATE TABLE games (id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, icon TEXT, proxy_mode TEXT DEFAULT 'inherit', created_at INTEGER)
  `)
  current.run(`
    CREATE TABLE environments (id TEXT PRIMARY KEY, name TEXT NOT NULL, partition TEXT NOT NULL UNIQUE, proxy TEXT, created_at INTEGER)
  `)
  current.run(`
    CREATE TABLE game_environments (
      game_id TEXT NOT NULL, environment_id TEXT NOT NULL, created_at INTEGER,
      PRIMARY KEY (game_id, environment_id),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE
    )
  `)
  current.run('INSERT INTO environments (id, name, partition, created_at) VALUES (?, ?, ?, ?)', [
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'Preserved environment',
    'persist:silo-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    1
  ])
  current.run('INSERT INTO game_environments (game_id, environment_id, created_at) VALUES (?, ?, ?)', [
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    2
  ])
  current.run('PRAGMA user_version = 2')
  writeFileSync(path, Buffer.from(current.export()))
  current.close()
}

async function migrationSuccessCase() {
  console.log('Phase 2 migration success case')
  await app.whenReady()
  const userData = mkdtempSync(join(tmpdir(), 'silo-phase2-migration-success-'))
  app.setPath('userData', userData)
  await createLegacyDatabase(join(userData, 'silo.db'))
  const { appStartup, initDB, getEnvironments, getAllEnvironments } = await import('../out/main/index.js')
  await appStartup
  assert.equal(getEnvironments('11111111-1111-4111-8111-111111111111').length, 1)
  assert.equal(getAllEnvironments().some((environment) => environment.id === '77777777-7777-4777-8777-777777777777'), true, 'orphan environments are preserved')
  await initDB()
  assert.equal(getAllEnvironments().filter((environment) => environment.id === '22222222-2222-4222-8222-222222222222').length, 1, 'repeated migration is idempotent')
  app.quit()
}

async function migrationFailureCase() {
  console.log('Phase 2 migration failure case')
  await app.whenReady()
  const userData = mkdtempSync(join(tmpdir(), 'silo-phase2-migration-failure-'))
  app.setPath('userData', userData)
  const dbPath = join(userData, 'silo.db')
  await createLegacyDatabase(dbPath, { invalidPartition: true })
  const { appStartup } = await import('../out/main/index.js')
  await assert.rejects(appStartup, /could not safely migrate|stable identity/i)
  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs()
  const preserved = new SQL.Database(readFileSync(dbPath))
  const columns = preserved.exec('PRAGMA table_info(environments)')[0].values
  assert.equal(columns.some((row) => row[1] === 'game_id'), true, 'failed migration leaves the legacy database intact')
  preserved.close()
  app.quit()
}

async function orphanRelationshipRecoveryCase() {
  console.log('Phase 2 orphan relationship recovery case')
  await app.whenReady()
  const userData = mkdtempSync(join(tmpdir(), 'silo-phase2-orphan-recovery-'))
  app.setPath('userData', userData)
  const dbPath = join(userData, 'silo.db')
  await createCurrentOrphanDatabase(dbPath)
  const { appStartup, initDB } = await import('../out/main/index.js')
  await appStartup

  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs()
  const recovered = new SQL.Database(readFileSync(dbPath))
  assert.equal(recovered.exec('SELECT COUNT(*) FROM game_environments')[0].values[0][0], 0, 'invalid active links are removed')
  assert.deepEqual(
    recovered.exec('SELECT game_id, environment_id, created_at FROM orphaned_game_environments')[0].values[0],
    ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 2],
    'orphan relationship identity is preserved in quarantine'
  )
  assert.equal(recovered.exec('SELECT COUNT(*) FROM environments')[0].values[0][0], 1, 'orphan Environment is preserved')
  recovered.close()

  await initDB()
  const repeated = new SQL.Database(readFileSync(dbPath))
  assert.equal(
    repeated.exec('SELECT COUNT(*) FROM orphaned_game_environments')[0].values[0][0],
    1,
    'repeated orphan recovery is idempotent'
  )
  repeated.close()
  app.quit()
}

async function main() {
  console.log('Phase 2 regression suite starting')
  await app.whenReady()
  const userData = mkdtempSync(join(tmpdir(), 'silo-phase2-'))
  app.setPath('userData', userData)

  const silo = await import('../out/main/index.js')
  await silo.appStartup
  const { atomicWriteFile } = silo
  const storagePath = join(userData, 'atomic.json')
  atomicWriteFile(storagePath, '{"version":1}')
  atomicWriteFile(storagePath, '{"version":2}', { backupPath: `${storagePath}.bak` })
  assert.deepEqual(JSON.parse(readFileSync(storagePath, 'utf8')), { version: 2 })
  assert.deepEqual(JSON.parse(readFileSync(`${storagePath}.bak`, 'utf8')), { version: 2 })
  assert.throws(() => atomicWriteFile(join(storagePath, 'child'), '{}'))
  assert.equal(statSync(storagePath).isFile(), true, 'failed atomic write does not replace the original')

  const {
    initDB, createGame, createEnvironment, getGames, getGameById, partitionForEnvironment, persist
  } = silo
  const gameId = '33333333-3333-4333-8333-333333333333'
  const envId = '44444444-4444-4444-8444-444444444444'
  createGame(gameId, 'Test game', 'http://127.0.0.1:1/unreachable')
  createEnvironment(envId, gameId, 'Test environment', partitionForEnvironment(envId), null)
  assert.equal(getGames().some((game) => game.id === gameId), true, 'database changes persist successfully')
  writeFileSync(join(userData, 'silo.db'), 'corrupted database')
  await initDB()
  assert.equal(getGameById(gameId)?.name, 'Test game', 'database backup restores a corrupted primary')

  const badUserData = join(userData, 'not-a-directory')
  writeFileSync(badUserData, 'file')
  app.setPath('userData', badUserData)
  assert.throws(
    () => persist(),
    (error) => error?.code === 'PERSISTENCE_FAILED' && !String(error.message).includes(badUserData),
    'database persistence failures are structured and do not expose paths'
  )
  app.setPath('userData', userData)
  assert.equal(getGameById(gameId)?.name, 'Test game')

  const { saveSmartProxySettings, loadSmartProxySettings, getBaseDomain, rememberProxyCredentials, getProxyCredentials } = silo
  saveSmartProxySettings({ smartProxyEnabled: false })
  saveSmartProxySettings({ smartProxyEnabled: true })
  writeFileSync(join(userData, 'settings.json'), '{invalid')
  assert.deepEqual(loadSmartProxySettings(), { smartProxyEnabled: true }, 'settings recover from the previous valid JSON')
  assert.equal(getBaseDomain('example.com'), 'example.com')
  assert.equal(getBaseDomain('game.example.com'), 'example.com')
  assert.equal(getBaseDomain('game.example.co.uk'), 'example.co.uk')
  assert.equal(getBaseDomain('subdomain.game.example.co.uk'), 'example.co.uk')

  const sessionA = session.fromPartition('persist:silo-proxy-a')
  const sessionB = session.fromPartition('persist:silo-proxy-b')
  rememberProxyCredentials('http://alice:one@proxy.example.com:8080', sessionA)
  rememberProxyCredentials('http://bob:two@proxy.example.com:8080', sessionB)
  assert.equal(getProxyCredentials(sessionA, 'proxy.example.com', '8080')?.username, 'alice')
  assert.equal(getProxyCredentials(sessionB, 'proxy.example.com', '8080')?.username, 'bob')

  const ipcWindow = new BrowserWindow({
    show: false,
    webPreferences: { preload: join(process.cwd(), 'out/preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  await ipcWindow.loadURL('data:text/html,<body>IPC fixture</body>')
  const ipcErrors = await ipcWindow.webContents.executeJavaScript(`(async () => {
    const errors = []
    for (const operation of [
      () => window.silo.renameGame('not-an-id', 'x'),
      () => window.silo.createGame('valid name', 'javascript:alert(1)'),
      () => window.silo.setEnvironmentProxy(${JSON.stringify(envId)}, 'file:///tmp/secret'),
      () => window.silo.launchBrowser('not-an-id', 'not-an-id', { x: 0, y: 0, width: 800, height: 500 })
    ]) {
      try { await operation() } catch (error) { errors.push(String(error.message)) }
    }
    return errors
  })()`)
  assert.equal(ipcErrors.length, 4, 'invalid renderer requests are rejected')
  assert.equal(ipcErrors.every((message) => !message.includes(userData)), true, 'IPC errors do not expose filesystem paths')
  const proxyEntries = [
    { id: '88888888-8888-4888-8888-888888888888', label: 'Alice', value: 'http://alice:one@proxy.example.com:8080', color: '#ff0000' },
    { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', label: 'Bob', value: 'http://bob:two@proxy.example.com:8080', color: '#00ff00' }
  ]
  await ipcWindow.webContents.executeJavaScript(`window.silo.saveProxies(${JSON.stringify(proxyEntries)})`)
  const storedProxies = JSON.parse(readFileSync(join(userData, 'proxies.json'), 'utf8'))
  assert.equal(Array.isArray(storedProxies.entries), true, 'proxy file stores safe metadata entries')
  assert.equal(JSON.stringify(storedProxies).includes('alice'), false, 'proxy file does not contain plaintext credentials')
  assert.equal((await ipcWindow.webContents.executeJavaScript('window.silo.loadProxies()')).length, 2, 'saved proxies round-trip through IPC')
  ipcWindow.destroy()

  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html' })
    response.end('<!doctype html><script>window.testReady = true</script><body>Game fixture</body>')
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const launchGameId = '55555555-5555-4555-8555-555555555555'
  const launchEnvId = '66666666-6666-4666-8666-666666666666'
  createGame(launchGameId, 'Launch game', `http://127.0.0.1:${port}/game`)
  createEnvironment(launchEnvId, launchGameId, 'Launch environment', partitionForEnvironment(launchEnvId), null)

  const { setBrowserWindow, launchBrowserSession, closeBrowserSession, getOpenBrowserIds, browserSessions } = silo
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } })
  setBrowserWindow(window)
  const bounds = { x: 0, y: 0, width: 800, height: 500 }
  const launchId = `${launchGameId}:${launchEnvId}`
  await launchBrowserSession(launchGameId, launchEnvId, bounds)
  assert.equal(getOpenBrowserIds().includes(launchId), true, 'real WebContentsView launch reaches RUNNING')
  const gameView = browserSessions.get(launchId).view
  const windowCount = BrowserWindow.getAllWindows().length
  await gameView.webContents.executeJavaScript("window.open('javascript:alert(1)')")
  await wait(100)
  assert.equal(BrowserWindow.getAllWindows().length, windowCount, 'dangerous popup does not create an Electron window')
  await closeBrowserSession(launchGameId, launchEnvId)
  assert.equal(getOpenBrowserIds().includes(launchId), false, 'close removes the running session')

  await assert.rejects(
    launchBrowserSession(gameId, envId, bounds),
    /failed|ERR_|Unable|load|Web contents/i,
    'failed launch rejects'
  )
  assert.equal([...browserSessions.keys()].some((id) => id === `${gameId}:${envId}`), false, 'failed launch cleans tracking')

  await launchBrowserSession(launchGameId, launchEnvId, bounds)
  const crashedView = browserSessions.get(launchId).view
  crashedView.webContents.forcefullyCrashRenderer()
  await waitFor(() => !browserSessions.has(launchId))
  assert.equal(getOpenBrowserIds().includes(launchId), false, 'renderer crash invalidates the session')

  await server.close()
  if (!window.isDestroyed()) window.destroy()
  app.quit()
  console.log('Phase 2 regression tests passed: persistence, migration fixtures, IPC-related validation, lifecycle, security, proxy scoping, and domains')
}

if (process.argv.includes('--migration-success')) {
  migrationSuccessCase().catch((error) => {
    console.error('Phase 2 migration success test failed:', error)
    process.exitCode = 1
    app.quit()
  })
} else if (process.argv.includes('--migration-failure')) {
  migrationFailureCase().catch((error) => {
    console.error('Phase 2 migration failure test failed:', error)
    process.exitCode = 1
    app.quit()
  })
} else if (process.argv.includes('--orphan-recovery')) {
  orphanRelationshipRecoveryCase().catch((error) => {
    console.error('Phase 2 orphan relationship recovery test failed:', error)
    process.exitCode = 1
    app.quit()
  })
} else {
  main().catch((error) => {
    console.error('Phase 2 regression test failed:', error)
    process.exitCode = 1
    app.quit()
  })
}
