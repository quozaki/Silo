import { app, ipcMain, session } from 'electron'
import { randomUUID } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  getGames,
  createGame,
  renameGame,
  deleteGame,
  getEnvironments,
  getAllEnvironments,
  createEnvironment,
  renameEnvironment,
  setEnvironmentProxy,
  deleteEnvironment
} from './db'

export function registerIPC(): void {
  // ── Games ──────────────────────────────────────────────────────────────────

  ipcMain.handle('games:get', () => getGames())

  ipcMain.handle('games:create', (_, name: string, url: string) => {
    const id = randomUUID()
    createGame(id, name, url)
    return id
  })

  ipcMain.handle('games:rename', (_, id: string, name: string) => renameGame(id, name))
  ipcMain.handle('games:delete', async (_, id: string) => {
    const partitions = deleteGame(id)
    await Promise.all(partitions.map((p) => session.fromPartition(p).clearStorageData()))
  })

  // ── Environments ───────────────────────────────────────────────────────────

  ipcMain.handle('envs:get', (_, gameId: string) => getEnvironments(gameId))
  ipcMain.handle('envs:getAll', () => getAllEnvironments())

  ipcMain.handle('envs:create', (_, gameId: string, name: string, proxy: string | null) => {
    const id = randomUUID()
    const partition = `persist:silo-${id}`
    createEnvironment(id, gameId, name, partition, proxy)
    return { id, partition }
  })

  ipcMain.handle('envs:rename', (_, id: string, name: string) => renameEnvironment(id, name))

  ipcMain.handle('envs:setProxy', (_, id: string, proxy: string | null) => {
    setEnvironmentProxy(id, proxy)
    // Apply immediately if the session is already open
    // (will take full effect on next launch if already running)
  })

  ipcMain.handle('envs:delete', async (_, id: string) => {
    const partition = deleteEnvironment(id)
    if (partition) {
      await session.fromPartition(partition).clearStorageData()
    }
  })

  ipcMain.handle('envs:clearSession', (_, partition: string) => {
    const ses = session.fromPartition(partition)
    return ses.clearStorageData()
  })

  // ── Proxies ──────────────────────────────────────────────────────────────────
  ipcMain.handle('proxies:load', () => {
    try {
      const filePath = join(app.getPath('userData'), 'proxies.json')
      if (!existsSync(filePath)) return []
      const raw = readFileSync(filePath, 'utf-8')
      return JSON.parse(raw)
    } catch {
      return []
    }
  })

  ipcMain.handle('proxies:save', (_, proxies: unknown) => {
    try {
      const filePath = join(app.getPath('userData'), 'proxies.json')
      writeFileSync(filePath, JSON.stringify(proxies, null, 2), 'utf-8')
    } catch {
      // never throw to renderer
    }
  })
}
