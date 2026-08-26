---
skill: git + electron-dev
repo: C:\Users\quozaki\Desktop\Silo
vault: C:\Users\quozaki\Desktop\ObsidianVault\01 Projects\Silo.md
---

# Coding Agent Prompt — Monorepo Split (Silo)

Copy-paste:

```
Load skill: read C:\Users\quozaki\Desktop\ObsidianVault\Skills\electron-dev\SKILL.md if exists. Use git subtree.

Repo: C:\Users\quozaki\Desktop\Silo — currently 1 commit bfd2f1b, no remote, dirty: 15 modified + 7 untracked (v2 split-sidebar: TabBar thumbs/proxyColorMap, Workspace 3 empty states, main.css, Sidebar/Modals/Settings/App). Do in order:

1. PRESERVE: git add -A; git commit -m "chore: preserve v2 split-sidebar work before split" (include silo-app/, silo-web/, concept.md, design-system/, Silo.md copy). Verify git status clean.

2. SPLIT preserving history:
   - git subtree split -P silo-app -b silo-app-split
   - git subtree split -P silo-web -b silo-web-split
   - Outside monorepo: mkdir C:\Users\quozaki\Desktop\silo-app && cd there; git init; git fetch C:\Users\quozaki\Desktop\Silo silo-app-split; git checkout silo-app-split; copy concept.md + design-system/silo/MASTER.md + design-system/silo/pages/welcome.md into repo root/docs/ if not already in subtree history.
   - Same for C:\Users\quozaki\Desktop\silo-web with silo-web-split branch.

3. VERIFY: In each new repo run npm install && npm run dev (electron-vite for app, vite for web) — must boot with no errors. Keep dark OLED theme, persist:silo-<uuid> isolation, no new deps.

4. OFFER: If gh CLI authenticated, offer to run: gh repo create silo-app --private --source=C:\Users\quozaki\Desktop\silo-app --push && gh repo create silo-web --private --source=C:\Users\quozaki\Desktop\silo-web --push ; else print push instructions and STOP (don't force push).

Constraints: Preserve git history via subtree, don't rewrite bfd2f1b, respect WebContentsView partitions.
```
