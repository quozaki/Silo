import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { app, BrowserWindow } from 'electron'

await app.whenReady()
app.setPath('userData', mkdtempSync(join(tmpdir(), 'silo-startup-smoke-')))
const { appStartup } = await import('../out/main/index.js')
await appStartup
assert.equal(BrowserWindow.getAllWindows().length > 0, true)
process.stderr.write('Application startup smoke test passed\n')
await new Promise((resolve) => setTimeout(resolve, 100))
app.quit()
// This smoke test owns the only application window and should terminate even
// when the production shutdown guard is waiting for a window-close event.
app.exit(0)
