# Page override — Welcome / First-run (games.length === 0)

Goal: teach **Games → Environments** in one glance and convert to the first "Add game". Replaces: badge pill, 3-step strip, fake meta stats.

## Composition (single centered column, max-w 520)
1. **Mark** — 64px logo tile (existing glyph), radius 16, inset top highlight.
2. **H1** — "Welcome to Silo" · Inter 26–28/700.
3. **Subtitle** — one sentence: isolation promise. `--text-muted`, max-w 360.
4. **CTA row** — primary white button "Add your first game" + inline kbd hint `⌘ N` (mono).
5. **Model diagram** (aria-hidden; footnote carries the text meaning) — mini mock of the real sidebar:
   - Column captions: `GAME` / `ENVIRONMENTS` (11px caps mono labels).
   - Left: one game card (thumb tile + name + count badge) styled like `.game-row`.
   - Connector: elbow lines from card into a tree guide.
   - Right: 3 env rows styled exactly like `.env-row`: `Main` (green open dot + blue proxy dot), `Alt 1` (hollow), `Farm` (hollow + orange proxy dot).
   - Recognition transfer: users see their future sidebar before it exists.
6. **Footnote** — "Games are what you launch. Environments are who you launch as." + dot legend (green = live · colored = proxy).

## Rules
- Backdrop: workspace dot-grid + single indigo radial glow top-center (≤10% alpha).
- One primary action only. No secondary nav (Settings reachable from sidebar).
- Entrance: mark → title → CTA → diagram staggered 40ms, y 10→0.
- No WebGL/specular gimmicks in v1 CTA.
