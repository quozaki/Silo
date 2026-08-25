# Silo — Monorepo

Parent repository containing the Silo desktop app and marketing website as siblings.

```
Silo/
├── silo-app/      → Electron desktop app (React + TypeScript, WebContentsView isolation)
└── silo-web/      → Marketing website (Vite + React, deploys to Vercel)
└── silo-website/  → Single-file marketing site (single index.html, no build) — legacy, see silo-web
```

## Desktop app
```bash
cd silo-app
npm install
npm run dev      # Electron + Vite
npm run build:win
```

## Website (React)
```bash
cd silo-web
npm install
npm run dev      # Vite
npm run build    # → dist/
```

Vercel: Root Directory `silo-web`, Build `npm run build`, Output `dist`.

## Website (single-file)
`silo-website/index.html` — standalone inline CSS/JS, no build, for quick Vercel static deploy.

## Icons
`Icon/` holds source `Icon.png/.ico/.icns` (three stacked bars) — synced to `silo-app/build/` + `silo-app/resources/` + `silo-web/src` via generation.
