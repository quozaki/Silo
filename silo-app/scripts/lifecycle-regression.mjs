/* eslint-disable @typescript-eslint/explicit-function-return-type */
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import { app, BrowserWindow } from 'electron'

async function main() {
  console.log('Lifecycle regression starting')
  await app.whenReady()
  const userData = mkdtempSync(join(tmpdir(), 'silo-lifecycle-'))
  app.setPath('userData', userData)
  const silo = await import('../out/main/index.js')
  await silo.appStartup

  const {
    createGame, createEnvironment, getEnvironments, getAllEnvironments, getGameById, getEnvironmentById,
    partitionForEnvironment, renameGame, deleteGame, renameEnvironment, deleteEnvironment, attachEnvironmentToGame
  } = silo
  const { setBrowserWindow, launchBrowserSession, closeBrowserSession, getOpenBrowserIds, browserSessions } = silo

  // Helper server for launch tests
  const server = createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<!doctype html><body>game</body>')
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  const urlA = `http://127.0.0.1:${port}/a`

  // ---- Game lifecycle ----
  console.log('  Game lifecycle: create/rename/launch/close/delete')
  const gameA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  createGame(gameA, 'Game A', 'https://example.com/a')
  assert.equal(getGameById(gameA).name, 'Game A')
  renameGame(gameA, 'Game A Renamed')
  assert.equal(getGameById(gameA).name, 'Game A Renamed')
  renameGame(gameA, 'Game A')
  assert.equal(getGameById(gameA).name, 'Game A')
  // Need a game with reachable URL for launch
  const gameLaunch = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  createGame(gameLaunch, 'LaunchGame', urlA)
  const envLaunch = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  createEnvironment(envLaunch, gameLaunch, 'Env1', partitionForEnvironment(envLaunch), null)
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } })
  setBrowserWindow(win)
  const bounds = { x: 0, y: 0, width: 800, height: 500 }
  const sessionId = `${gameLaunch}:${envLaunch}`
  await launchBrowserSession(gameLaunch, envLaunch, bounds)
  assert.equal(getOpenBrowserIds().includes(sessionId), true, 'launch creates running session')
  await closeBrowserSession(gameLaunch, envLaunch)
  assert.equal(getOpenBrowserIds().includes(sessionId), false, 'close removes session')
  await launchBrowserSession(gameLaunch, envLaunch, bounds)
  assert.equal(getOpenBrowserIds().includes(sessionId), true, 'relaunch after close works')
  await closeBrowserSession(gameLaunch, envLaunch)
  deleteGame(gameLaunch)
  assert.equal(getGameById(gameLaunch), null, 'game deleted')
  if (!win.isDestroyed()) win.destroy()

  // ---- Environment lifecycle ----
  console.log('  Environment lifecycle: create/rename/attach/launch/close/relaunch/delete')
  const game1 = '11111111-1111-4111-8111-111111111111'
  const game2 = '22222222-2222-4222-8222-222222222222'
  createGame(game1, 'Game A2', urlA)
  createGame(game2, 'Game B', urlA)
  const envX = '33333333-3333-4333-8333-333333333333'
  createEnvironment(envX, game1, 'Env X', partitionForEnvironment(envX), null)
  assert.equal(getEnvironmentById(envX).name, 'Env X')
  renameEnvironment(envX, 'Env X Renamed')
  assert.equal(getEnvironmentById(envX).name, 'Env X Renamed')
  renameEnvironment(envX, 'Env X')
  attachEnvironmentToGame(game2, envX)
  assert.equal(getEnvironments(game1).some(e=>e.id===envX), true)
  assert.equal(getEnvironments(game2).some(e=>e.id===envX), true, 'attach creates second relationship')
  attachEnvironmentToGame(game2, envX)
  assert.equal(getEnvironments(game2).filter(e=>e.id===envX).length, 1, 'attach twice not duplicate')

  const win2 = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } })
  setBrowserWindow(win2)
  const b = { x: 0, y: 0, width: 800, height: 500 }
  const sessA = `${game1}:${envX}`
  const sessB = `${game2}:${envX}`
  await launchBrowserSession(game1, envX, b)
  assert.equal(getOpenBrowserIds().includes(sessA), true, 'Game A+Env X launches')
  await launchBrowserSession(game2, envX, b)
  assert.equal(getOpenBrowserIds().includes(sessB), true, 'Game B+Env X launches (shared partition)')
  assert.equal(browserSessions.size >=2, true)
  await closeBrowserSession(game1, envX)
  assert.equal(getOpenBrowserIds().includes(sessA), false)
  assert.equal(getOpenBrowserIds().includes(sessB), true, 'closing A does not close B')

  // Delete Game A does NOT delete Env X
  deleteGame(game1)
  assert.equal(getGameById(game1), null, 'Game A deleted')
  assert.notEqual(getEnvironmentById(envX), null, 'Env X survives Game delete')
  assert.equal(getEnvironments(game2).some(e=>e.id===envX), true, 'Env X still linked to Game B')
  assert.equal(getOpenBrowserIds().includes(sessB), true)

  await closeBrowserSession(game2, envX)
  deleteEnvironment(envX)
  assert.equal(getEnvironmentById(envX), null, 'Env deleted')
  assert.equal(getEnvironments(game2).length, 0, 'Game B env relationship removed')

  console.log('  Relationship integrity checks')
  try {
    attachEnvironmentToGame('00000000-0000-4000-8000-000000000000', '00000000-0000-4000-8000-000000000001')
    assert.fail('invalid attach should throw')
  } catch (e) {
    assert.match(String(e.message), /not found|Game/i)
  }
  const g3 = '44444444-4444-4444-8444-444444444444'
  const e3 = '55555555-5555-4555-8555-555555555555'
  createGame(g3, 'G3', urlA)
  createEnvironment(e3, g3, 'E3', partitionForEnvironment(e3), null)
  attachEnvironmentToGame(g3, e3)
  attachEnvironmentToGame(g3, e3)
  assert.equal(getEnvironments(g3).filter(x=>x.id===e3).length, 1)
  const g4 = '66666666-6666-4666-8666-666666666666'
  createGame(g4, 'G4', urlA)
  attachEnvironmentToGame(g4, e3)
  assert.equal(getEnvironments(g4).some(x=>x.id===e3), true)
  deleteGame(g3)
  assert.equal(getEnvironments(g4).some(x=>x.id===e3), true, 'deleting G3 does not remove G4 link')
  try { deleteGame(g4)}catch { /* best-effort test cleanup */ }
  try { deleteEnvironment(e3)}catch { /* best-effort test cleanup */ }

  // Orphan preservation: create env attached to g5, delete g5, env should remain
  const g5 = '77777777-7777-4777-8777-777777777777'
  const eOrphan = '88888888-8888-4888-8888-888888888888'
  createGame(g5, 'G5', urlA)
  createEnvironment(eOrphan, g5, 'OrphanEnv', partitionForEnvironment(eOrphan), null)
  deleteGame(g5)
  assert.notEqual(getEnvironmentById(eOrphan), null, 'orphan preserved')
  assert.equal(getAllEnvironments().some(e=>e.id===eOrphan), true)
  const g6 = '99999999-9999-4999-8999-999999999999'
  createGame(g6, 'G6', urlA)
  attachEnvironmentToGame(g6, eOrphan)
  assert.equal(getEnvironments(g6).some(e=>e.id===eOrphan), true, 'orphan attach creates valid relationship')
  attachEnvironmentToGame(g6, eOrphan)
  assert.equal(getEnvironments(g6).filter(e=>e.id===eOrphan).length,1, 'orphan attach idempotent')

  await new Promise((r)=>server.close(r))
  if (!win2.isDestroyed()) win2.destroy()
  console.log('Lifecycle regression passed')
  app.quit()
}

app.whenReady().then(main).catch(e=>{ console.error('Lifecycle regression failed', e); process.exitCode=1; try{app.quit()}catch { /* best-effort test cleanup */ } })
