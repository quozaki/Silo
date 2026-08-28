import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { app, BrowserWindow, session } from 'electron'

/* eslint-disable @typescript-eslint/explicit-function-return-type */


const origin = 'http://127.0.0.1'
let server
const windows = []

// Keep the integration test isolated from a developer's real Electron
// profile, whose existing cache/OS-credential state can make test partitions
// fail before the application behavior is exercised.
app.setPath('userData', mkdtempSync(join(tmpdir(), 'silo-isolation-')))

function listen() {
  return new Promise((resolve, reject) => {
    server = http.createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html' })
      response.end('<!doctype html><html><body>Silo isolation integration fixture</body></html>')
    })
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve(`http://127.0.0.1:${address.port}/fixture`)
    })
  })
}

async function createBrowserWindow(partition, url) {
  const browserSession = session.fromPartition(partition)
  const window = new BrowserWindow({
    show: false,
    webPreferences: { session: browserSession, contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  windows.push(window)
  await window.loadURL(url)
  return window
}

async function readWebStorage(window) {
  return window.webContents.executeJavaScript(`(async () => ({
    localStorage: localStorage.getItem('silo-local-storage'),
    indexedDb: await new Promise((resolve, reject) => {
      const request = indexedDB.open('silo-isolation', 1)
      request.onupgradeneeded = (event) => {
        const database = event.target.result
        if (!database.objectStoreNames.contains('state')) database.createObjectStore('state')
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        if (!database.objectStoreNames.contains('state')) {
          database.close()
          resolve(null)
          return
        }
        const transaction = database.transaction('state', 'readonly')
        const get = transaction.objectStore('state').get('value')
        get.onerror = () => reject(get.error)
        get.onsuccess = () => {
          database.close()
          resolve(get.result ?? null)
        }
      }
    })
  }))()`)
}

async function writeWebStorage(window, value) {
  await window.webContents.executeJavaScript(`(async () => {
    localStorage.setItem('silo-local-storage', ${JSON.stringify(value)})
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('silo-isolation', 1)
      request.onupgradeneeded = (event) => {
        const database = event.target.result
        if (!database.objectStoreNames.contains('state')) database.createObjectStore('state')
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const transaction = request.result.transaction('state', 'readwrite')
        transaction.objectStore('state').put(${JSON.stringify(value)}, 'value')
        transaction.oncomplete = resolve
        transaction.onerror = () => reject(transaction.error)
      }
    })
  })()`)
}

async function closeWindow(window) {
  if (window && !window.isDestroyed()) window.destroy()
}

async function main() {
  try {
    const url = await listen()
    const environmentA = randomUUID()
    const environmentB = randomUUID()
    const partitionA = `persist:silo-${environmentA}`
    const partitionB = `persist:silo-${environmentB}`
    assert.notEqual(environmentA, environmentB)
    assert.notEqual(partitionA, partitionB, 'different environments have different partition identities')

    const sessionA = session.fromPartition(partitionA)
    const sessionB = session.fromPartition(partitionB)
    assert.equal(sessionA, session.fromPartition(partitionA), 'partition A resolves to a stable session')
    assert.notEqual(sessionA, sessionB, 'partition A and B resolve to different Electron sessions')

    const windowA = await createBrowserWindow(partitionA, url)
    const windowB = await createBrowserWindow(partitionB, url)
    await sessionA.cookies.set({ url: origin, name: 'silo-cookie', value: 'environment-a', path: '/' })
    await writeWebStorage(windowA, 'environment-a')

    const cookiesB = await sessionB.cookies.get({ url: origin })
    assert.equal(cookiesB.some((cookie) => cookie.name === 'silo-cookie'), false, 'cookies do not cross partitions')
    assert.deepEqual(await readWebStorage(windowB), { localStorage: null, indexedDb: null }, 'localStorage and IndexedDB do not cross partitions')

    await closeWindow(windowA)
    const recreatedA = await createBrowserWindow(partitionA, url)
    const cookiesAAfterRecreate = await sessionA.cookies.get({ url: origin })
    assert.equal(cookiesAAfterRecreate.find((cookie) => cookie.name === 'silo-cookie')?.value, 'environment-a', 'cookies persist after session recreation')
    assert.deepEqual(await readWebStorage(recreatedA), { localStorage: 'environment-a', indexedDb: 'environment-a' }, 'localStorage and IndexedDB persist after session recreation')
    assert.equal((await sessionB.cookies.get({ url: origin })).some((cookie) => cookie.name === 'silo-cookie'), false, 'B remains isolated after A recreation')

    console.log('Isolation integration tests passed: cookies, localStorage, IndexedDB, persistence, partition identity')
  } finally {
    for (const window of windows) await closeWindow(window)
    if (server) await new Promise((resolve) => server.close(resolve))
    if (app.isReady()) app.quit()
  }
}

app.whenReady().then(main).catch((error) => {
  console.error('Isolation integration test failed:', error)
  process.exitCode = 1
})
