/* eslint-disable @typescript-eslint/explicit-function-return-type */
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { app, BrowserWindow, session } from 'electron'

const IDS = {
  game: '11111111-1111-4111-8111-111111111111',
  env: '22222222-2222-4222-8222-222222222222'
}

async function main() {
  console.log('Proxy credential security regression starting')
  await app.whenReady()
  const userData = mkdtempSync(join(tmpdir(), 'silo-proxy-credential-sec-'))
  app.setPath('userData', userData)
  const silo = await import('../out/main/index.js')
  await silo.appStartup

  const ipcWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: join(process.cwd(), 'out/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  await ipcWindow.loadURL('data:text/html,<body>credential security fixture</body>')

  const add = (id, username, password) => ipcWindow.webContents.executeJavaScript(`window.silo.addProxy(${JSON.stringify({
    id,
    label: username === 'alice' ? 'Residential A' : 'Residential B',
    address: `http://${username}:${password}@proxy.example.com:8080`,
    color: '#60a5fa'
  })})`)

  const alice = await add('33333333-3333-4333-8333-333333333333', 'alice', 'alice-secret')
  const bob = await add('44444444-4444-4444-8444-444444444444', 'bob', 'bob-secret')

  // 1/2: renderer-facing responses contain only safe metadata.
  const loaded = await ipcWindow.webContents.executeJavaScript('window.silo.loadProxies()')
  assert.equal(loaded.length, 2)
  for (const entry of loaded) {
    assert.deepEqual(Object.keys(entry).sort(), ['authenticated', 'color', 'host', 'id', 'label', 'port', 'protocol'])
    assert.equal(JSON.stringify(entry).includes('secret'), false)
    assert.equal('username' in entry, false)
    assert.equal('password' in entry, false)
    assert.equal('value' in entry, false)
  }
  assert.equal(JSON.stringify(alice).includes('alice-secret'), false, 'add IPC response does not contain password')

  // 3: actual persisted files are inspected, not just mocked return values.
  const proxyFile = readFileSync(join(userData, 'proxies.json'), 'utf8')
  const credentialFile = readFileSync(join(userData, 'proxy-credentials.json'), 'utf8')
  assert.equal(proxyFile.includes('alice-secret'), false)
  assert.equal(proxyFile.includes('bob-secret'), false)
  assert.equal(credentialFile.includes('alice-secret'), false)
  assert.equal(credentialFile.includes('bob-secret'), false)

  const { createGame, createEnvironment, partitionForEnvironment, getEnvironmentById, getProxyConfig } = silo
  createGame(IDS.game, 'Credential game', 'https://example.com')
  createEnvironment(IDS.env, IDS.game, 'Credential environment', partitionForEnvironment(IDS.env), alice.id)
  assert.equal(getEnvironmentById(IDS.env).proxy, alice.id)
  const dbBytes = readFileSync(join(userData, 'silo.db')).toString('utf8')
  assert.equal(dbBytes.includes('alice-secret'), false)
  assert.equal(dbBytes.includes('bob-secret'), false)

  // 4: same host/port entries remain distinct by proxy identity.
  const ses = session.fromPartition('persist:silo-credential-isolation')
  const aliceConfig = getProxyConfig(alice.id)
  const bobConfig = getProxyConfig(bob.id)
  silo.rememberProxyCredentialsForProxy(alice.id, aliceConfig.proxyRules, { username: 'alice', password: 'alice-secret' }, ses)
  silo.rememberProxyCredentialsForProxy(bob.id, bobConfig.proxyRules, { username: 'bob', password: 'bob-secret' }, ses)
  assert.equal(silo.getProxyCredentials(ses, 'proxy.example.com', '8080', alice.id).username, 'alice')
  assert.equal(silo.getProxyCredentials(ses, 'proxy.example.com', '8080', alice.id).password, 'alice-secret')
  assert.equal(silo.getProxyCredentials(ses, 'proxy.example.com', '8080', bob.id).username, 'bob')
  assert.equal(silo.getProxyCredentials(ses, 'proxy.example.com', '8080', bob.id).password, 'bob-secret')

  // 5: Electron login uses the active main-process credential, never renderer input.
  const authWindow = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } })
  silo.rememberProxyCredentialsForProxy(alice.id, aliceConfig.proxyRules, { username: 'alice', password: 'alice-secret' }, authWindow.webContents.session)
  let loginResult
  let prevented = false
  app.emit('login', { preventDefault: () => { prevented = true } }, authWindow.webContents, {}, { isProxy: true, host: 'proxy.example.com', port: 8080 }, (username, password) => {
    loginResult = { username, password }
  })
  assert.equal(prevented, true)
  assert.deepEqual(loginResult, { username: 'alice', password: 'alice-secret' })
  authWindow.destroy()

  // 6: closing/deleting an Environment clears runtime credential state.
  silo.clearProxyCredentials(ses)
  assert.equal(silo.proxyCredentials.has(ses), false)
  silo.deleteEnvironment(IDS.env)
  assert.equal(silo.proxyCredentials.has(ses), false)

  // 7/8: restart-style reload keeps functionality while files remain opaque.
  silo.resetProxyStoreForTests()
  silo.initializeProxyStore()
  const reloadedAlice = silo.getProxyConfig(alice.id)
  assert.equal(reloadedAlice.username, 'alice')
  assert.equal(reloadedAlice.password, 'alice-secret')
  assert.equal(readFileSync(join(userData, 'proxies.json'), 'utf8').includes('alice-secret'), false)

  // Legacy migration: plaintext URL fields are moved into safeStorage before
  // the migrated SQLite/JSON files are committed.
  const legacyProxyId = '55555555-5555-4555-8555-555555555555'
  const legacyEnvId = '66666666-6666-4666-8666-666666666666'
  const legacyAddress = 'http://legacy-user:legacy-secret@legacy.example.com:8080'
  writeFileSync(join(userData, 'proxies.json'), JSON.stringify([{ id: legacyProxyId, label: 'Legacy', value: legacyAddress, color: '#60a5fa' }]))
  try { unlinkSync(join(userData, 'proxies.json.bak')) } catch { /* absent */ }
  try { unlinkSync(join(userData, 'proxy-credentials.json')) } catch { /* absent */ }
  try { unlinkSync(join(userData, 'proxy-credentials.json.bak')) } catch { /* absent */ }
  try { unlinkSync(join(userData, 'silo.db')) } catch { /* absent */ }
  try { unlinkSync(join(userData, 'silo.db.bak')) } catch { /* absent */ }
  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs()
  const legacyDb = new SQL.Database()
  legacyDb.run(`
    CREATE TABLE games (id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, icon TEXT, proxy_mode TEXT DEFAULT 'inherit', created_at INTEGER);
    CREATE TABLE environments (id TEXT PRIMARY KEY, name TEXT NOT NULL, partition TEXT NOT NULL UNIQUE, proxy TEXT, account_hint TEXT, created_at INTEGER);
    CREATE TABLE game_environments (game_id TEXT NOT NULL, environment_id TEXT NOT NULL, created_at INTEGER, PRIMARY KEY (game_id, environment_id));
  `)
  legacyDb.run('INSERT INTO games VALUES (?, ?, ?, NULL, ?, ?)', [IDS.game, 'Legacy game', 'https://example.com', 'inherit', 1])
  legacyDb.run('INSERT INTO environments VALUES (?, ?, ?, ?, NULL, ?)', [legacyEnvId, 'Legacy environment', `persist:silo-${legacyEnvId}`, legacyAddress, 2])
  legacyDb.run('INSERT INTO game_environments VALUES (?, ?, ?)', [IDS.game, legacyEnvId, 2])
  legacyDb.run('PRAGMA user_version = 3')
  writeFileSync(join(userData, 'silo.db'), Buffer.from(legacyDb.export()))
  legacyDb.close()
  silo.resetProxyStoreForTests()
  silo.initializeProxyStore()
  await silo.initDB()
  assert.equal(silo.getEnvironmentById(legacyEnvId).proxy, legacyProxyId)
  assert.equal(readFileSync(join(userData, 'proxies.json'), 'utf8').includes('legacy-secret'), false)
  assert.equal(readFileSync(join(userData, 'proxies.json.bak'), 'utf8').includes('legacy-secret'), false)
  assert.equal(readFileSync(join(userData, 'proxies.json'), 'utf8').includes('legacy-user'), false)
  assert.equal(readFileSync(join(userData, 'proxies.json.bak'), 'utf8').includes('legacy-user'), false)
  assert.equal(readFileSync(join(userData, 'silo.db'), 'utf8').includes('legacy-secret'), false)
  assert.equal(readFileSync(join(userData, 'silo.db'), 'utf8').includes('legacy-user'), false)
  assert.equal(silo.getProxyConfig(legacyProxyId).password, 'legacy-secret')

  // 9: malformed credential/configuration requests fail safely and redact secrets.
  const invalidErrors = await ipcWindow.webContents.executeJavaScript(`(async () => {
    const errors = []
    for (const operation of [
      () => window.silo.addProxy({ label: 'bad', address: 'http://:only-password@proxy.example.com:8080', color: '#60a5fa' }),
      () => window.silo.addProxy({ label: 'bad', address: 'http://alice:bad-secret@proxy.example.com:not-a-port', color: '#60a5fa' }),
      () => window.silo.setEnvironmentProxy('${IDS.env}', 'not-a-proxy-id')
    ]) {
      try { await operation(); errors.push('should have thrown') } catch (error) { errors.push(String(error.message)) }
    }
    return errors
  })()`)
  assert.equal(invalidErrors.every((message) => message !== 'should have thrown'), true)
  assert.equal(invalidErrors.every((message) => !message.includes('bad-secret')), true)

  ipcWindow.destroy()
  if (!authWindow.isDestroyed()) authWindow.destroy()
  app.quit()
  console.log('Proxy credential security regression passed')
}

app.whenReady().then(main).catch((error) => {
  console.error('Proxy credential security regression failed:', error)
  process.exitCode = 1
  try { app.quit() } catch { /* best-effort cleanup */ }
})
