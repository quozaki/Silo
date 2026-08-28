import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import { app, BrowserWindow } from 'electron'

/** @returns {Promise<void>} */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

/** @returns {Promise<void>} */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function main() {
  console.log('Shutdown regression starting')
  await app.whenReady()
  app.setPath('userData', mkdtempSync(join(tmpdir(), 'silo-shutdown-')))
  const silo = await import('../out/main/index.js')
  await silo.appStartup

  const server = createServer((_request, response) => {
    setTimeout(() => {
      response.writeHead(200, { 'content-type': 'text/html' })
      response.end('<!doctype html><body>delayed game</body>')
    }, 5000)
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const gameId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const environmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  silo.createGame(gameId, 'Shutdown game', `http://127.0.0.1:${port}/game`)
  silo.createEnvironment(environmentId, gameId, 'Shutdown environment', silo.partitionForEnvironment(environmentId), null)

  const window = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  })
  silo.setBrowserWindow(window)
  const launch = silo.launchBrowserSession(gameId, environmentId, { x: 0, y: 0, width: 800, height: 500 })
  await wait(100)
  await silo.shutdownBrowserSessions()
  await assert.rejects(launch, /shutting down|failed|destroyed|closed/i)
  assert.equal(silo.browserSessions.size, 0, 'shutdown clears browser session tracking')
  assert.equal(silo.openViews.size, 0, 'shutdown clears view tracking')

  await new Promise((resolve) => server.close(resolve))
  if (!window.isDestroyed()) window.destroy()
  console.log('Shutdown regression passed')
  app.quit()
}

app.whenReady().then(main).catch((error) => {
  console.error('Shutdown regression failed:', error)
  process.exitCode = 1
  app.quit()
})
