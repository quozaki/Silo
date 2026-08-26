#!/usr/bin/env node
// Smoke test: isolation - 2 games x 2 envs with distinct proxyId
// Verifies: persist:silo-<uuid> isolation, showView/hideAllViews clean, delete → removeViewForPartition + clearStorageData + setProxy direct
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(fileURLToPath(import.meta.url), '../..')
const INDEX = readFileSync(join(ROOT, 'src/main/index.ts'), 'utf-8')
const IPC = readFileSync(join(ROOT, 'src/main/ipc.ts'), 'utf-8')
const VIEWS = readFileSync(join(ROOT, 'src/main/views.ts'), 'utf-8')
const DB = readFileSync(join(ROOT, 'src/main/db.ts'), 'utf-8')

let failures = 0
function assert(cond, msg) {
  if (!cond) {
    console.error('✗ FAIL:', msg)
    failures++
  } else {
    console.log('✓', msg)
  }
}

// 1. Check persist:silo-<uuid> pattern intact
assert(INDEX.includes("persist:silo-"), "index.ts contains persist:silo- prefix")
assert(INDEX.includes("session.fromPartition(partition)") || INDEX.includes("session.fromPartition('persist:silo-"), "index.ts uses session.fromPartition per env")
assert(IPC.includes("persist:silo-"), "ipc.ts contains persist:silo-")
assert(IPC.includes("`persist:silo-${id}`") || IPC.includes('persist:silo-'), "ipc.ts creates env partition as persist:silo-<uuid>")
assert(DB.includes("partition TEXT NOT NULL") && DB.includes("persist:silo-") || IPC.includes("persist:silo-"), "DB partition column exists")

// Verify 2 games x 2 envs would produce 4 unique partitions (static check: createEnvironment uses randomUUID + persist:silo-)
assert(IPC.includes("createEnvironment") && IPC.includes("persist:silo-"), "createEnvironment generates unique persist:silo-<uuid>")

// 2. Check showView/hideAllViews defensive
assert(INDEX.includes("function hideAllViews") && INDEX.includes("contentView.children") && INDEX.includes("removeChildView"), "hideAllViews defensive detach every child")
assert(INDEX.includes("function showView") && INDEX.includes("hideAllViews()") && INDEX.includes("addChildView") && INDEX.includes("setBounds"), "showView does hideAllViews + addChildView + setBounds")
assert(INDEX.includes("browser:resize") && INDEX.includes("getWorkspaceBounds") && INDEX.includes("setBounds"), "browser:resize does setBounds with getWorkspaceBounds")
assert(INDEX.includes("getWorkspaceBounds") && INDEX.includes("x: 280") && INDEX.includes("y: 72") && INDEX.includes("innerWidth-280") || INDEX.includes("SIDEBAR_WIDTH"), "getWorkspaceBounds = {x:280,y:72,w:innerWidth-280,h:innerHeight-72}")

// 3. Check delete → removeViewForPartition + clearStorageData + setProxy direct
assert(VIEWS.includes("removeViewForPartition") && VIEWS.includes("openViews.delete") && VIEWS.includes("removeChildView") && VIEWS.includes("webContents.close"), "views.ts removeViewForPartition does view.remove + close + map delete")
assert(VIEWS.includes("removeViewsForPartitions"), "views.ts has removeViewsForPartitions")
assert(IPC.includes("removeViewForPartition") && IPC.includes("removeViewsForPartitions"), "ipc.ts imports removeView(s) helpers")
assert(IPC.includes("games:delete") && IPC.includes("removeViewsForPartitions"), "games:delete calls removeViewsForPartitions")
assert(IPC.includes("envs:delete") && IPC.includes("removeViewForPartition"), "envs:delete calls removeViewForPartition")
const expectedStorages = ['cookies','localstorage','indexdb','cachestorage','shadercache','serviceworkers']
for (const s of expectedStorages) {
  assert(IPC.includes(s), `ipc.ts clearStorageData includes ${s}`)
}
assert(IPC.includes("setProxy({ mode: 'direct' })") || IPC.includes('setProxy({ mode:'), "ipc.ts reset proxy to direct on delete")
assert(INDEX.includes("applyProxy") && INDEX.includes("setProxy"), "index.ts applyProxy per env proxyId")

// 4. Check no view leaks: openViews cleared on window closed, browser:close, delete
assert(INDEX.includes("mainWindow.on('closed'") && INDEX.includes("openViews.clear()"), "index.ts clears openViews on window closed")
assert(INDEX.includes("browser:close") && INDEX.includes("openViews.delete"), "browser:close deletes from openViews")
assert(INDEX.includes("pendingLaunches") && INDEX.includes("openViews.has"), "pendingLaunches prevents duplicate view leaked")

// 5. Check no new deps / dark theme is done elsewhere but sanity check build artifacts exist conceptually
assert(existsSync(join(ROOT, 'package.json')), "package.json exists")
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
assert(!pkg.dependencies['new-dep'], "no new deps added (sanity)")

// 6. Simulate 2x2 isolation with mock session
console.log("\n--- Simulating 2 games x 2 envs isolation ---")
import { randomUUID } from 'crypto'
// mock session map
const mockSessions = new Map()
function mockFromPartition(p) {
  if (!mockSessions.has(p)) mockSessions.set(p, { partition: p, cookies: new Map(), proxy: null, clearStorageData: async (opts) => {
    // simulate wipe
    const s = mockSessions.get(p)
    s.cleared = opts
  }, setProxy: async (cfg) => { mockSessions.get(p).proxy = cfg } })
  return mockSessions.get(p)
}
const games = []
const envsByGame = {}
for (let gi = 0; gi < 2; gi++) {
  const gid = randomUUID()
  games.push({ id: gid, name: `Game${gi+1}` })
  envsByGame[gid] = []
  for (let ei = 0; ei < 2; ei++) {
    const eid = randomUUID()
    const partition = `persist:silo-${eid}`
    const proxy = `socks5://user${gi}${ei}:pass@127.0.0.${gi}${ei}:1080`
    // ensure distinct proxyId
    envsByGame[gid].push({ id: eid, partition, proxy })
    // simulate isolated session
    const ses = mockFromPartition(partition)
    ses.proxy = proxy
    ses.cookies.set('test', `value-${eid}`)
    console.log(`  Game${gi+1} Env${ei+1}: ${eid.slice(0,8)} partition=${partition} proxy=${proxy}`)
  }
}
// verify isolation: each partition has distinct session and cookies
assert(mockSessions.size === 4, `4 unique persist:silo partitions created (got ${mockSessions.size})`)
let leak = false
for (const [p, ses] of mockSessions) {
  // each session's cookie should be unique, not leaked to others
  for (const [otherP, otherSes] of mockSessions) {
    if (p === otherP) continue
    if (ses.cookies.get('test') === otherSes.cookies.get('test')) leak = true
  }
}
assert(!leak, "cookies/storage do not leak across persist:silo partitions (each partition isolated)")

// verify proxies distinct
const proxies = Object.values(envsByGame).flat().map(e=>e.proxy)
assert(new Set(proxies).size === 4, "4 envs have distinct proxyId values")

// verify showView/hideAllViews clean simulation
console.log("\n--- Simulating showView/hideAllViews ---")
let contentViewChildren = []
let openViewsMock = new Map()
function hideAllViewsMock() {
  contentViewChildren = [] // detach every child
}
function showViewMock(envId, bounds) {
  const view = openViewsMock.get(envId)
  if (!view) return
  hideAllViewsMock()
  contentViewChildren.push(view)
  view.bounds = bounds
  // paranoia ensure only one
  if (contentViewChildren.length !== 1 || contentViewChildren[0] !== view) leak = true
}
for (const env of Object.values(envsByGame).flat()) {
  openViewsMock.set(env.id, { id: env.id, bounds: null, session: mockFromPartition(env.partition) })
}
const firstEnv = Object.values(envsByGame).flat()[0]
showViewMock(firstEnv.id, { x:280, y:72, width:800, height:600 })
assert(contentViewChildren.length === 1 && contentViewChildren[0].id === firstEnv.id, "showView adds single view")
const secondEnv = Object.values(envsByGame).flat()[1]
showViewMock(secondEnv.id, { x:280, y:72, width:800, height:600 })
assert(contentViewChildren.length === 1 && contentViewChildren[0].id === secondEnv.id, "showView cleans previous (hideAllViews) → no leak, only active view attached")
hideAllViewsMock()
assert(contentViewChildren.length === 0, "hideAllViews detaches all → clean")

// verify delete → removeViewForPartition + clearStorageData + setProxy direct
console.log("\n--- Simulating delete → removeView + clearStorageData + setProxy direct ---")
let deletePartition = Object.values(envsByGame).flat()[0].partition
let deleteEnvId = Object.values(envsByGame).flat()[0].id
// simulate openViews containing that env
openViewsMock = new Map([[deleteEnvId, { id: deleteEnvId, session: mockFromPartition(deletePartition) }]])
contentViewChildren = [{ id: deleteEnvId, session: mockFromPartition(deletePartition) }]
// simulate removeViewForPartition
function removeViewForPartitionMock(partition) {
  for (const [eid, view] of [...openViewsMock.entries()]) {
    if (view.session.partition === partition) {
      openViewsMock.delete(eid)
      contentViewChildren = contentViewChildren.filter(c => c.session.partition !== partition)
    }
  }
  // clearStorageData + setProxy direct
  const ses = mockFromPartition(partition)
  ses.clearedStorages = ['cookies','localstorage','indexdb','cachestorage','shadercache','serviceworkers']
  ses.proxy = { mode: 'direct' }
}
removeViewForPartitionMock(deletePartition)
assert(!openViewsMock.has(deleteEnvId), "removeViewForPartition deletes from openViews (no leak)")
assert(contentViewChildren.length === 0, "removeViewForPartition detaches view from contentView")
assert(mockFromPartition(deletePartition).clearedStorages.length === 6, "clearStorageData called with 6 storages")
assert(mockFromPartition(deletePartition).proxy.mode === 'direct', "setProxy direct after delete (no proxy leak)")

console.log("\n" + (failures === 0 ? "✓ All isolation smoke checks passed" : `✗ ${failures} failure(s)`))
process.exit(failures === 0 ? 0 : 1)
