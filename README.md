# Silo — Monorepo

Parent repository containing the Silo desktop app and marketing website as siblings.

```
Silo/
├── silo-app/         → Electron desktop app (React 19 + TypeScript, Electron 43, WebContentsView isolation)
├── silo-web/         → Marketing website (Next.js 14 + React 18 + Tailwind, deploys to Vercel)
├── design-system/silo/ → Design system (MASTER.md + pages/welcome.md)
├── concept.md        → Full concept document (mirrored in silo-app/ and silo-web/docs/)
└── .prompts/         → Session prompts / task logs
```

## Desktop app
```bash
cd silo-app
npm install
npm run dev      # Electron + Vite
npm run build:win
```

## Website (Next.js)
```bash
cd silo-web
npm install
npm run dev      # Next.js (next dev)
npm run build    # → .next/
```

Vercel: Root Directory `silo-web`, Framework `Next.js`, Build `npm run build`.

## Icons
`silo-app/Icon/` holds source `Icon.png/.ico/.icns` (three stacked bars) — synced to `silo-app/build/` + `silo-app/resources/` via electron-builder.
