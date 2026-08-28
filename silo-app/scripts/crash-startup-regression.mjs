import assert from 'node:assert/strict'
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { mkdtempSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import { app, BrowserWindow } from 'electron'

const wait = (ms)=> new Promise(r=>setTimeout(r,ms))
const waitFor = async (cond, timeout=5000)=>{
  const end=Date.now()+timeout
  while(Date.now()<end){ if(cond()) return; await wait(30)}
  throw new Error('Timeout')
}

async function main(){
  console.log('Crash & startup regression starting')
  await app.whenReady()
  const userData = mkdtempSync(join(tmpdir(), 'silo-crash-'))
  app.setPath('userData', userData)
  const silo = await import('../out/main/index.js')
  await silo.appStartup
  const { createGame, createEnvironment, partitionForEnvironment, getEnvironmentById } = silo
  const { setBrowserWindow, launchBrowserSession, closeBrowserSession, getOpenBrowserIds, browserSessions, openViews } = silo

  const server = createServer((req,res)=>{ res.writeHead(200,{'content-type':'text/html'}); res.end('<!doctype html><body>crash</body>')})
  await new Promise(r=>server.listen(0,'127.0.0.1',r))
  const port = server.address().port
  const url = `http://127.0.0.1:${port}/game`
  const win = new BrowserWindow({show:false, webPreferences:{contextIsolation:true, nodeIntegration:false, sandbox:true}})
  setBrowserWindow(win)
  const bounds={x:0,y:0,width:800,height:500}

  // Crash recovery
  console.log('  Browser crash recovery')
  const g='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const e='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  createGame(g,'CrashGame', url)
  createEnvironment(e,g,'CrashEnv', partitionForEnvironment(e), null)
  const id=`${g}:${e}`
  await launchBrowserSession(g,e,bounds)
  assert.equal(getOpenBrowserIds().includes(id), true)
  const record = browserSessions.get(id)
  assert.equal(record.state,'RUNNING')
  const view = record.view
  // Force crash
  view.webContents.forcefullyCrashRenderer()
  await waitFor(()=> !browserSessions.has(id), 3000)
  assert.equal(getOpenBrowserIds().includes(id), false, 'crash removes RUNNING')
  assert.equal(openViews.has(id), false, 'openViews cleaned')
  // renderer would have received stateChanged; we test that closing crashed is safe
  await closeBrowserSession(g,e).catch(() => { /* already closed */ }) // should not throw
  assert.equal(browserSessions.has(id), false, 'close after crash safe')
  // relaunch should work
  await launchBrowserSession(g,e,bounds)
  assert.equal(getOpenBrowserIds().includes(id), true, 'relaunch after crash works')
  await closeBrowserSession(g,e)
  assert.equal(getOpenBrowserIds().includes(id), false, 'close after relaunch works')
  // second crash without relaunch
  await launchBrowserSession(g,e,bounds)
  const rec2 = browserSessions.get(id)
  rec2.view.webContents.forcefullyCrashRenderer()
  await waitFor(()=> !browserSessions.has(id))
  // try launch again
  await launchBrowserSession(g,e,bounds)
  assert.equal(getOpenBrowserIds().includes(id), true)
  await closeBrowserSession(g,e)

  // Ensure crash does not permanently block
  const { deleteEnvironment, deleteGame } = silo
  deleteEnvironment(e)
  deleteGame(g)

  // Startup / stale runtime state
  console.log('  Startup stale runtime state')
  // Create persistent metadata
  const gS='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  const eS='dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  createGame(gS,'StartupGame', url)
  createEnvironment(eS,gS,'StartupEnv', partitionForEnvironment(eS), null)
  // Launch session
  await launchBrowserSession(gS,eS,bounds)
  assert.equal(getOpenBrowserIds().includes(`${gS}:${eS}`), true)
  // Simulate abnormal termination: browserSessions is in-memory, should not be persisted to DB
  // Verify DB does not contain RUNNING state
  const dbPath = join(userData, 'silo.db')
  assert.equal(existsSync(dbPath), true)
  // Read raw DB and ensure no session table exists (only games/environments)
  const initSqlJs = (await import('sql.js')).default
  const SQL = await initSqlJs()
  const db = new SQL.Database(readFileSync(dbPath))
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'").map(r=>r.values.flat()).flat()
  assert.equal(tables.includes('games'), true)
  assert.equal(tables.includes('environments'), true)
  assert.equal(tables.includes('browserSessions'), false, 'no persisted session table')
  db.close()
  // Simulate restart: clear in-memory but keep DB file, re-init
  // In real restart, browserSessions would be fresh Map. We simulate by clearing and calling initDB
  // But our current process already has browserSessions with one entry. We clear via shutdown
  // Then call initDB again and verify metadata intact but no fake RUNNING
  const { initDB } = silo
  // Close sessions
  await closeBrowserSession(gS,eS)
  assert.equal(getOpenBrowserIds().length,0)
  // Now call initDB as if restarting
  await initDB()
  assert.notEqual(getEnvironmentById(eS), null, 'env metadata intact after restart')
  // After restart, no fake RUNNING
  assert.equal(getOpenBrowserIds().length,0, 'no fake RUNNING after restart')
  // Env remains launchable
  await launchBrowserSession(gS,eS,bounds)
  assert.equal(getOpenBrowserIds().includes(`${gS}:${eS}`), true, 'env launchable after restart')
  await closeBrowserSession(gS,eS)
  deleteEnvironment(eS)
  deleteGame(gS)

  await new Promise(r=>server.close(r))
  if (!win.isDestroyed()) win.destroy()
  console.log('Crash & startup regression passed')
  app.quit()
}
app.whenReady().then(main).catch(e=>{ console.error('Crash/startup regression failed',e); process.exitCode=1; try{app.quit()}catch { /* best-effort test cleanup */ } })
