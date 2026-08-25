# Silo — Concept Document

## What is Silo?

Silo is a desktop application that lets you run multiple completely independent browser sessions side by side — each one isolated from the others at the cookie, storage, and identity level.

You define **Games** (the websites you play or use) and **Environments** (the accounts you run them on). Silo handles everything else.

---

## The Problem

Running multiple accounts on the same website is painful.

You either use:
- Multiple browsers (Chrome, Firefox, Edge) — messy, hard to organise
- Incognito windows — sessions don't persist, you log in every time
- Browser profiles — buried in settings, no structure, no labels
- Third-party tools — bloated, expensive, not built for this use case

None of these feel intentional. They're workarounds.

---

## The Idea

**Game ≠ Environment.**

A Game is what you're launching — a website, a platform, a service.
An Environment is who you're launching it as — a specific isolated browser identity.

```
StrategyCombat          ← Game (the site)
├── Main                ← Environment (Account A)
├── Alt 1               ← Environment (Account B)
└── Alt 2               ← Environment (Account C)
```

You never touch cookies. You never think about profiles.
You just pick a game, pick an environment, and launch.

---

## Core Principle

> The user should never have to understand cookies, profiles, storage partitions, or browser contexts.
> They see: Games → Environments. That's it.

---

## How the Isolation Works

Each Environment maps to a unique Chromium session partition:

```
Main   →  persist:silo-<uuid-1>
Alt 1  →  persist:silo-<uuid-2>
Alt 2  →  persist:silo-<uuid-3>
```

These are completely separate:
- Cookies
- localStorage
- IndexedDB
- Cache
- Session tokens

Logging into Account A in Main has zero effect on Alt 1.
Closing Silo and reopening it — both sessions are exactly where you left them.

---

## The Stack

| Layer | Technology |
|---|---|
| UI | React + TypeScript |
| Desktop shell | Electron |
| Browser engine | Chromium (via Electron's WebContentsView) |
| Persistence | sql.js (SQLite compiled to WASM) |
| Build tool | electron-vite |

**Why Electron?**
Electron ships its own Chromium. This means we fully control the browser engine and session partitioning. Tauri (the alternative) uses the OS webview, which doesn't expose the session isolation APIs we need.

**Why sql.js over better-sqlite3?**
sql.js is SQLite compiled to WebAssembly — no native C++ build dependencies. It works on any platform out of the box. better-sqlite3 requires Visual Studio build tools on Windows, adding unnecessary friction to the setup.

---

## Data Model

```
Game
├── id          (UUID)
├── name        (e.g. "StrategyCombat")
├── url         (e.g. "https://strategycombat.gg")
├── icon        (optional)
└── created_at

Environment
├── id          (UUID)
├── game_id     (foreign key → Game)
├── name        (e.g. "Main", "Alt 1", "Farm")
├── partition   (e.g. "persist:silo-<uuid>")
└── created_at
```

---

## The UI

```
┌─────────────────────────────────────────────────────┐
│ SILO                                                │  ← titlebar (draggable)
├──────────────┬──────────────────────────────────────┤
│              │ StrategyCombat · Main  ×  Alt 1  ×   │  ← tab bar
│ GAMES        ├──────────────────────────────────────┤
│              │                                      │
│ 🎮 Strategy  │                                      │
│   ├ ● Main   │         Browser session              │
│   ├ ○ Alt 1  │         renders here                 │
│   └ ○ Alt 2  │                                      │
│              │                                      │
│ 🎮 Game B    │                                      │
│   ├ ● Main   │                                      │
│   └ ○ Farm   │                                      │
│              │                                      │
│ + Add Game   │                                      │
└──────────────┴──────────────────────────────────────┘
```

● = environment is currently open
○ = environment exists but not running

---

## The MVP Flow

1. User opens Silo for the first time
2. They click **+ Add Game** → enter name + URL → Create
3. Inside the game, they click **+ Add Environment** → name it → Create
4. They click an environment in the sidebar
5. A browser tab opens inside Silo, loading the game's URL
6. They log in — session is saved to that environment's isolated partition
7. They open another environment — completely separate session
8. They close Silo
9. They reopen Silo — click the same environment
10. They're still logged in

**That's the whole product.**

---

## 7-Day Build Plan

| Day | Goal |
|---|---|
| 1 | Project scaffold, architecture, database schema |
| 2 | Game + Environment CRUD (create, rename, delete) |
| 3 | Browser isolation — prove sessions don't bleed |
| 4 | Workspace UI — sidebar, tabs, browser views |
| 5 | Launch system — multi-environment launch flow |
| 6 | Polish + real testing (session, UX, edge cases) |
| 7 | MVP release — clean onboarding, final feel |

---

## What Silo is NOT

- Not a VPN or proxy tool
- Not a privacy/anonymity product
- Not a browser replacement
- Not a tab manager for normal browsing

Silo is a **workspace organiser for people who run multiple accounts**.

---

## Name

**Silo** — each environment is completely walled off from the others.
No cross-contamination. No bleed. Just isolation.
