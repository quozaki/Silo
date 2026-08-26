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
  getEnvironmentPartition,
  deleteEnvironment
} from './db'
import { removeViewForPartition, removeViewsForPartitions } from './views'

export function registerIPC(): void {
  // ── Games ──────────────────────────────────────────────────────────────────

  ipcMain.handle('games:get', () => getGames())

  ipcMain.handle('games:create', (_, name: string, url: string) => {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 64) throw new Error('Invalid game name')
    if (typeof url !== 'string' || !url.trim() || url.length > 2048) throw new Error('Invalid game URL')
    try {
      const u = new URL(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`)
      if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Invalid protocol')
    } catch {
      throw new Error('Invalid game URL')
    }
    const id = randomUUID()
    createGame(id, name.trim(), url.trim())
    return id
  })

  ipcMain.handle('games:rename', (_, id: string, name: string) => renameGame(id, name))
  ipcMain.handle('games:delete', async (_, id: string) => {
    const partitions = deleteGame(id)
    // view.remove on delete + clearStorageData — prevent leaked views
    try {
      removeViewsForPartitions(partitions)
    } catch {
      // ignore
    }
    await Promise.all(
      partitions.map((p) =>
        session
          .fromPartition(p)
          .clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage', 'shadercache', 'serviceworkers'] })
          .catch(() => {})
      )
    )
  })

  // ── Environments ───────────────────────────────────────────────────────────

  ipcMain.handle('envs:get', (_, gameId: string) => getEnvironments(gameId))
  ipcMain.handle('envs:getAll', () => getAllEnvironments())

  ipcMain.handle('envs:create', (_, gameId: string, name: string, proxy: string | null) => {
    if (typeof gameId !== 'string' || !/^[0-9a-f-]{36}$/.test(gameId)) throw new Error('Invalid gameId')
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 32) throw new Error('Invalid env name')
    if (proxy !== null && (typeof proxy !== 'string' || !/^(socks5|socks4|http):\/\/.+/i.test(proxy))) throw new Error('Invalid proxy')
    const id = randomUUID()
    const partition = `persist:silo-${id}`
    createEnvironment(id, gameId, name.trim(), partition, proxy)
    return { id, partition }
  })

  ipcMain.handle('envs:rename', (_, id: string, name: string) => renameEnvironment(id, name))

  ipcMain.handle('envs:setProxy', async (_, id: string, proxy: string | null) => {
    const partition = getEnvironmentPartition(id)
    setEnvironmentProxy(id, proxy)
    // Apply immediately to live session if already open — proxy per session, not global
    if (partition) {
      try {
        const ses = session.fromPartition(partition)
        if (proxy) await ses.setProxy({ proxyRules: proxy })
        else await ses.setProxy({ mode: 'direct' })
      } catch {
        // never throw to renderer
      }
    }
  })

  ipcMain.handle('envs:delete', async (_, id: string) => {
    const partition = deleteEnvironment(id)
    if (partition) {
      // view.remove + clearStorageData — prevent leaked views & storage bleed
      try {
        removeViewForPartition(partition)
      } catch {
        // ignore
      }
      await session
        .fromPartition(partition)
        .clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb', 'cachestorage', 'shadercache', 'serviceworkers'] })
        .catch(() => {})
      // Reset proxy for the partition to direct to avoid proxy leak into future envs reusing same partition string
      try {
        await session.fromPartition(partition).setProxy({ mode: 'direct' })
      } catch {
        // ignore
      }
    }
  })

  ipcMain.handle('envs:clearSession', (_, partition: string) => {
    const ses = session.fromPartition(partition)
    return ses.clearStorageData({ storages: ['cookies', 'localstorage', 'indexdb'] })
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
      if (!Array.isArray(proxies) || proxies.length > 50) return
      const valid = (proxies as unknown[]).every((p) => {
        if (typeof p !== 'object' || p === null) return false
        const e = p as Record<string, unknown>
        if (typeof e.id !== 'string' || !/^[0-9a-f-]{36}$/.test(e.id)) return false
        if (typeof e.label !== 'string' || e.label.length > 50) return false
        if (typeof e.value !== 'string' || e.value.length > 300) return false
        if (!/^(socks5|socks4|http):\/\/.+/i.test(e.value)) return false
        if (typeof e.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(e.color)) return false
        return true
      })
      if (!valid) return
      const filePath = join(app.getPath('userData'), 'proxies.json')
      writeFileSync(filePath, JSON.stringify(proxies, null, 2), 'utf-8')
    } catch {
      // never throw to renderer
    }
  })
}
