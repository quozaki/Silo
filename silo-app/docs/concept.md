# Silo — Concept Document

> **One place, many accounts — each completely isolated.**

Silo is a desktop workspace for people who run multiple accounts on the same website or game. Instead of juggling browsers, incognito windows, or hidden profiles, you define **Games** and **Environments** and launch them as isolated, persistent tabs.

Monorepo: `Silo/` → `silo-app/` (Electron desktop) + `silo-web/` (marketing site).

---

## 1. The Problem

Running multiple accounts on the same site is painful:

- **Multiple browsers** (Chrome / Firefox / Edge) — messy, no structure
- **Incognito** — no persistence, log in every time
- **Browser profiles** — buried, unlabeled, no hierarchy
- **Third-party “multi-account” tools** — bloated, expensive, not built for games

All are workarounds. None feel intentional.

## 2. The Idea

**Game ≠ Environment.**

- **Game** = *what* you launch — a website / platform (`https://strategycombat.gg`)
- **Environment** = *who* you launch it as — an isolated browser identity (`Main`, `Alt 1`, `Farm`)

```
StrategyCombat          ← Game
├── Main                ← Environment (persist:silo-<uuid-1>)
├── Alt 1               ← Environment (persist:silo-<uuid-2>)
└── Farm                ← Environment (persist:silo-<uuid-3>)

Global Base Combat      ← Game
├── Main
└── Alt 2
```

You never touch cookies. You click a Game → click an Environment → browser opens inside Silo.

## 3. Core Principle

> The user should never have to understand cookies, profiles, partitions, or storage.
> They see: **Games → Environments**. That's it.

Silo handles proxy assignment, partition lifecycle, session persistence, and storage clearing automatically.

## 4. How Isolation Works

Each Environment maps to a Chromium `persist:` partition (`silo-app/src/main/ipc.ts:42`, `silo-app/src/main/index.ts:81`):

```
persist:silo-<uuid>  →  isolated Session (cookies, localStorage, IndexedDB, Cache, tokens)
```

Implemented with Electron `WebContentsView` per Environment (`silo-app/src/main/index.ts:10,90`). Only one view is attached at a time (`showView`/`hideAllViews`), but all open views stay in memory (`openViews: Map<envId, WebContentsView>`). Switching tabs = `browser:show`, closing = `browser:close` + `session.clearStorageData()`.

On game/env deletion, the partition is wiped (`db.ts:131-144`, `ipc.ts:30-59`).

## 5. Proxy Pool (Optional)

**Problem:** Running 10 farming accounts from one IP gets you flagged.

**Solution:** Central **Proxy Pool** in Settings (`silo-app/src/renderer/src/components/Settings.tsx:3`).

- Stored in `proxies.json` (`app.getPath('userData')/proxies.json` via `ipc.ts:68-86`), not in SQLite
- Add `socks5://`, `socks4://`, `http://` entries with optional label + auto color (`#a78bfa` …)
- Silo **auto-assigns** the least-used proxy on Environment creation (`silo-app/src/renderer/src/App.tsx:77-89` — counts `env.proxy` usage, picks min)
- Applied per Session via `session.fromPartition(p).setProxy({ proxyRules })` (`index.ts:45-56`), reset to `direct` when removed
- UI: color dot per env row + proxy badge, indicators in sidebar (`main.css:904-919`)

User never sees `proxyRules` — just “Alt 1 uses blue dot (US Residential 1)”.

## 6. Game Catalog

To avoid typing URLs, **Add Game** modal includes a curated catalog (`Modals.tsx:18`) of 15 strategy/MMO titles (StrategyCombat, Global Base Combat, Panzer Quest, etc.) with thumbnails, search, category, and `selected` state. Selecting pre-fills name+URL; or enter manually. Catalog state is client-side, not persisted.

## 7. Data Model

SQLite via `sql.js` (WASM, no native build) at `app.getPath('userData')/silo.db` (`db.ts:9`):

```sql
games(id TEXT PK, name TEXT, url TEXT, icon TEXT, created_at INTEGER)
environments(id TEXT PK, game_id FK→games, name TEXT, partition TEXT, proxy TEXT, created_at INTEGER)
PRAGMA foreign_keys = ON
```

Types (`shared/types.ts:1`):

```ts
Game { id, name, url, icon?, created_at }
Environment { id, game_id, name, partition, proxy?: string|null, created_at }
Bounds { x,y,width,height }
```

Proxy pool is JSON file (`proxies.json`), not relational — allows reordering / color without migrations. Seed cleanup removes legacy `Strategy Combat`/`Global Base Combat` auto-seeds on first launch (`db.ts:55-95`).

## 8. The UI

```
┌─────────────────────────────────────────────────────┐
│ SILO                                ─ □ ×          │ ← TitleBar (drag, win controls) 32px
├──────────────┬──────────────────────────────────────┤
│ GAMES   [+]  │ Game · Env  ×   Alt 1  ×             │ ← TabBar 38px
│ 🔍 Search    ├──────────────────────────────────────┤
│              │                                      │
│ ▼ 🎮 Strat.  │   Welcome (if no games)              │
│   ● Main  ●  │   ┌──────────────────────┐           │
│   ○ Alt 1    │   │ [icon]               │           │
│   ○ Farm     │   │ Welcome to Silo      │           │
│   + Add Env  │   │ SpecularButton       │           │
│              │   │ "Add your first game"│           │
│ ▼ 🎮 Game B  │   │ (ogl WebGL highlight)│           │
│   ...        │   └──────────────────────┘           │
│              │                                      │
│ + Add Game   │   ── or ──                           │
│ ──────────   │   BrowserView renders here           │
│ ⚙ Settings   │   (WebContentsView, x=224,y=70)      │
└──────────────┴──────────────────────────────────────┘
```

- **Welcome** (`App.tsx:289-326`, `main.css:1294-1349`): shown when `games.length===0`, centered `icon.png` + `SpecularButton` (React Bits, `ogl` WebGL rim highlight, `followMouse`, `proximity=250`). Previously `btn-primary`, now glass specular CTA.
- **Sidebar** (`Sidebar.tsx`): virtual game groups, chevron, search filter, `openEnvIds` green dot, `proxyColorMap` dot
- **TabBar** (`TabBar.tsx`): open tabs = `OpenTab[]`, active highlight, close `×`
- **Workspace** (`Workspace.tsx`): empty state vs `workspace-active` (transparent so BrowserView shows through); resize handler recomputes `getWorkspaceBounds()` (`App.tsx:95`)
- **Modals** (`Modals.tsx`): `AddGameModal` (catalog + manual), `AddEnvModal` (auto-proxy notice), `Settings`

## 9. Key Flows

**First launch:**
1. Empty DB → Welcome + SpecularButton
2. Click → `AddGameModal` → name + URL (or catalog pick) → `games:create` → reload
3. Game card appears → `+ Add Environment` → name → auto proxy → `envs:create`
4. Click env row → `browser:launch(envId, partition, url, proxy, bounds)` → login → session persisted to `persist:` partition
5. Open second env → second partition, second login, no bleed
6. Quit → `db.export()` to disk → relaunch → still logged in

**Proxy flow:** Settings → Add `socks5://user:pass@ip:port` → color assigned → next env auto-picks least-used → dot appears.

**Rename/Delete:** optimistic + `loadGames()` refresh, `closeBrowser` if active, `clearStorageData` on partition.

## 10. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| UI | React 19 + TypeScript | Component model, hooks |
| Shell | Electron 43 + `WebContentsView` | Own Chromium, `session.fromPartition` isolation (Tauri uses OS webview, no API) |
| Bundler | `electron-vite` 5 + Vite 7 | SSR for main/preload, HMR for renderer |
| DB | `sql.js` 1.14 (WASM SQLite) | No `better-sqlite3` native build, no VS tools on Windows |
| Persistence | `silo.db` + `proxies.json` in `userData` | Portable, file-based |
| Shine | `ogl` 1.x | WebGL specular rim for SpecularButton |
| Styles | `main.css` / `base.css` | CSS variables (`--bg: #0e0e0e`), no Tailwind |
| Icons | `Icon/` → `silo-app/build/` + `resources/` | `electron-builder` 26 |

## 11. Monorepo

```
Silo/                 ← this file
├── silo-app/         ← Electron desktop (this concept)
│   ├── src/main/     ← db.ts, ipc.ts, index.ts (BrowserWindow + views)
│   ├── src/preload/  ← contextBridge → window.silo
│   ├── src/renderer/ ← App.tsx, components/, assets/
│   ├── src/shared/   ← types.ts
│   └── concept.md    ← focused app-only concept (synced)
├── silo-web/         ← Vite + React marketing site → Vercel (`dist/`)
└── README.md         ← top-level overview
```

Run: `cd silo-app && npm install && npm run dev` (`package.json:15`); build `npm run build:win`.

## 12. What Silo Is NOT

- Not a VPN / proxy seller
- Not a privacy/anonymity browser
- Not a general browser replacement
- Not a tab manager for normal browsing

It’s a **workspace organiser for multi-account workflows**.

## 13. Name

**Silo** — each environment is walled off. No contamination. No bleed. Just isolation.

---

*Last updated: 2026-08-25 — reflects proxy auto-assign, catalog, and SpecularButton welcome CTA.*
