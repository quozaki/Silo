# AGENT.md — Ismail's Workspace

## Overview

This is the workspace of **Ismail** (Quozaki), a solo founder based in Khemisset, Morocco.
You are operating as an assistant inside **Opencode**.

Active projects in scope:
- **Silo** — a desktop app (in development)
- **Obsidian Vault** — knowledge base and project documentation (read/write — vault edits pre-authorized, see below)

---

## Obsidian Vault

**Location:** `~/Desktop/ObsidianVault`

The vault is the single source of truth for notes, specs, ideas, and project documentation.
Silo's specs, decisions, and context live inside the vault — always check it before making
assumptions about the project.

**Rules:**
- You may **read and edit** existing notes and **create new notes** in the vault **without asking** — vault edits are pre-authorized whenever a task requires it (spec updates, decisions, new notes, linking).
- **Do not delete or rename** existing vault files — ask first (only exception to pre-authorization).
- Use vault notes as reference context when working on Silo.
- If a relevant note exists, prefer it over guessing.
- When you update a spec or make a decision, reflect it in the relevant vault note automatically.

---

## Silo

**Status:** In active development (early stage)

**What it is:**
Silo is a desktop app that lets the user run multiple accounts simultaneously on a single
screen. Each tab is isolated with its own cookies, allowing true multi-account usage without
interference. Monorepo `~/Desktop/Silo` → `silo-app/` (Electron desktop) + `silo-web/` (marketing site).

**Where to find specs:**
All planning docs, feature specs, and design decisions are documented in the Obsidian Vault
at `01 Projects/Silo.md` + `03 Resources/AI Coding Skills.md`, and in `Silo/design-system/silo/MASTER.md` + `concept.md`.
Read the relevant notes before touching any feature.

**Stack:**
- `silo-app` — Electron 43 + React 19 + TypeScript + electron-vite 5 (Vite 7) + sql.js 1.14 + ogl 1.x
- `silo-web` — Next.js 14 + React 18 + Tailwind 3.4 (Vercel)
- Isolation: Chromium `persist:silo-<uuid>` + `WebContentsView` per Environment
- See `01 Projects/Silo.md` and `concept.md` for full details.

---

## Agent Behavior

### Autonomy
- You have autonomy to read files, explore the codebase, and make additive changes.
- **Ask before any destructive action** — this includes:
  - Deleting files or directories
  - Overwriting existing files with significant changes
  - Renaming or moving files
  - Running migrations or schema changes
  - Uninstalling packages
  - Any irreversible operation

### General rules
- Prefer small, focused changes over large rewrites.
- If something is unclear or underdocumented, ask rather than assume.
- The Obsidian Vault can be read, edited, and extended **without asking** for create/update — only delete/rename requires approval (see Vault Rules above).
- Do not push to git or commit without being asked.
- Keep code consistent with whatever style already exists in the file you're editing.

---

## Workspace Structure

```
~/Desktop/
├── ObsidianVault/               # Knowledge base (read/edit, don't delete/rename without asking)
│   ├── 01 Projects/Silo.md      # Silo project note (check here first)
│   ├── 03 Resources/AI Coding Skills.md
│   └── Skills/INDEX.md          # Installed skills catalog
└── Silo/                        # Main working directory (this repo)
    ├── silo-app/                # Electron desktop app
    ├── silo-web/                # Next.js marketing site
    ├── design-system/silo/      # MASTER.md + pages/
    └── concept.md               # Full concept doc (mirrored)
```

---

## Notes for the Agent

- This is a solo founder workspace — context is sparse by design, use the vault to fill gaps.
- When in doubt about scope or intent, stop and ask.
- Ismail goes by **Quozaki** — you may see this handle in configs, commits, or branding.
