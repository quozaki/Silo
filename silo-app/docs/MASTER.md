# Silo — Master Design System (v2 — Split Sidebar)

> Source of truth for all Silo surfaces. Page overrides live in `pages/<page>.md`.
> UI/UX Pro Max synthesis — 2026-08-25 (v2):
> - Product query: `desktop workspace manager productivity tool isolated accounts` → **Style Minimalism & Swiss Style** (clean, geometric, grid-based, high-contrast, sparse chrome) — *retained*.
> - Dials: `--variance 3` Centered/Minimal, `--motion 3` Subtle, `--density 8` Dense/Dashboard — *retained; drives tight 4px spacing*.
> - Palette returned light Teal/Orange (`#0D9488/#EA580C` on `#F0FDFA`) — **overridden** to dark OLED graphite. Reason: desktop multi-account tool = long sessions, OLED, BrowserView white content; tool's own "Developer Tool / IDE → Dark Mode (OLED)" match (density 7 run) is the correct product identity. Light palette would bleach the workspace and fight browser content.
> - Typography `Plus Jakarta Sans` → **overridden** to `Inter + JetBrains Mono` (developer-tool pairing, already shipped, mono required for env/IP/count legibility).
> - Stack: `React 19 + Electron 43 + electron-vite` (detected from `package.json`).

---

## 1. Visual style — "Precision Console"

A dark, dense, Swiss-precision desktop tool. Chrome is matte and flat; signal is scarce and semantic. If a pixel has color or glow it means **selection (indigo), liveness (green), or proxy identity** — nothing else.

- Dark-only. No light theme.
- Surfaces rise by lightness, not shadow. Shadows only on floating layers (modals, workspace empty cards, elevated CTA).
- One permitted texture: workspace dot-grid (`radial 1px dot 22px grid`) — signals "canvas", vanishes when a browser is live.
- 1px borders define structure, not shadows. No glassmorphism, no gradients on controls (except subtle logo tile).

---

## 2. Color palette — exact hex codes

### Backgrounds & chrome
| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#09090B` | App floor, inputs, modal input bg |
| `--bg-workspace` | `#0C0C0E` | Main canvas behind BrowserView |
| `--bg-sidebar` | `#111113` | TitleBar + Sidebar shell |

### Surfaces (elevation ladder)
| Token | Hex | Usage |
|---|---|---|
| `--surface` | `#18181B` | Cards, rows hover, modals, empty-state cards |
| `--surface-2` | `#1F1F23` | Active/selected rows, logo tiles |
| `--surface-hover` | `#27272A` | Control hover, tab hover |
| `--surface-active` | `#27272A` | Pressed state |

### Borders
| Token | Hex | Usage |
|---|---|---|
| `--border-subtle` | `#1E1E20` | Sidebar divider, section rule, inner card sep |
| `--border` | `#27272A` | Component perimeter, input resting |
| `--border-strong` | `#3F3F46` | Inputs hover, strong separators |

### Text
| Token | Hex | Contrast on `--bg` | Allowed for |
|---|---|---|---|
| `--text` | `#FAFAFA` | 19.5:1 | Headings, active row text |
| `--text-secondary` | `#A1A1AA` | 7.9:1 | Body, env names idle, tab labels |
| `--text-muted` | `#71717A` | 4.6:1 | Section labels, counts, descriptions, placeholders |
| `--text-dim` | `#52525B` | 2.8:1 | **Decorative only** — caps hints, kbd legend, disabled |
| `--text-faint` | `#3F3F46` | 1.8:1 | Dots idle fill, hairline separators — never text |

WAI: Any body/label text must be `--text-muted` or brighter (≥4.5:1). `--text-dim` is never used where reading is required.

### Accent (interactive / selection)
| Token | Value | Usage |
|---|---|---|
| `--accent` | `#6366F1` | Focus ring, selection left-bar, selected checkbox border |
| `--accent-hover` | `#818CF8` | Link hover, not button fill |
| `--accent-dim` | `rgba(99,102,241,0.12)` | Banner bg, dashed add hover |
| `--accent-ring` | `rgba(99,102,241,0.35)` | Focus halo (3px spread) |
| `--accent-solid` | `#6366F1` | Alias |

Primary button is **inverted white**: bg `#FAFAFA` / text `#09090B` / border `#FAFAFA`. Hover `#E4E4E7`. Accent is not a button fill.

### Status
| Token | Value | Means |
|---|---|---|
| `--green` | `#22C55E` | **Live / Open** — env has an active BrowserView |
| `--green-dim` | `rgba(34,197,94,0.14)` | 3px halo around live dot |
| `--green-glow` | `rgba(34,197,94,0.35)` | Outer blur around live/proxy-coloured open dot |
| `--warning` | `#F59E0B` | Reserved (proxy error, quota) |
| `--danger` | `#EF4444` | Destructive hover, error text/borders |
| `--danger-dim` | `rgba(239,68,68,0.12)` | Danger button hover bg |

**Idle** is not a color — it's the absence of color: `7px` dot filled `--text-faint` (`#3F3F46`) with inset shadow.

### Proxy identity (data-viz, fixed order)
```
#a78bfa  #60a5fa  #34d399  #fb923c  #f472b6  #facc15  #38bdf8  #f87171
```
Rule: dot ≥7px + `0 0 6px currentColor` glow, `opacity .9`. When an env is **open** the live dot *itself* wears the pool color (replaces green). When idle, proxy is a separate trailing dot. Always accompanied by a tooltip/label with the proxy name/IP — never color-only.

---

## 3. Typography scale

Family: `--font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` + `--font-mono: 'JetBrains Mono','SF Mono','Fira Code',monospace`.

| Role | Face | Size / Weight | Line-height | Tracking | Color | Notes |
|---|---|---|---|---|---|---|
| TitleBar app name | Inter | 11 / 700 caps | 1 | +0.14em | `--text-muted` | `SILO` + `BETA` pill |
| Section header (GAMES / ENVIRONMENTS) | Inter | 10 / 700 caps | 1 | +0.12em | `--text-dim` | Uppercase |
| Game row | Inter | 13 / 600 | 1.3 | −0.01em | `#E4E4E7` | Selected = 700 / `--text` |
| Env row | Mono | 12.5 / 500 | 1 | −0.01em | `--text-secondary` | Active = 500 + `--text` |
| Count badge / IP | Mono | 11 / 600 tabular-nums | 1 | 0 | `--text-muted` | Pill |
| Tab — game fragment | Inter | 12.5 / 600 | 1 | −0.01em | inherit | |
| Tab — env fragment | Mono | 12 / 400 | 1 | 0 | `--text-muted` (active → `--text-secondary`) | Sep `·` = `--text-faint` 10px |
| Body / subtitle | Inter | 13–13.5 / 400 | 1.6 | 0 | `--text-muted` | |
| Modal title | Inter | 16 / 700 | 1.2 | −0.015em | `--text` | |
| Field label | Inter | 11 / 700 caps | 1 | +0.08em | `--text-muted` | |
| Caption / kbd | Mono | 10–11 / 600 | 1.3 | −0.01em | `--text-dim` / `--text-muted` | kbd = 10/600 pill |
| Welcome H1 | Inter | 26 / 700 | 1.1 | −0.02em | `--text` | |
| Empty-state title | Inter | 14–16 / 700 | 1.2 | −0.015em | `--text` | |
| Empty desc | Inter | 12.5–13 / 400 | 1.6 | 0 | `--text-muted` | |

Minimum readable text: 11px. Mono is mandatory wherever truncation or monospaced alignment matters (env names, IPs, counts, kbds).

---

## 4. Spacing system

Base unit **4px**. Scale used: **4 · 8 · 12 · 16 · 20 · 24 · 32** (density 8 = dense/dashboard).

| Token | px | Where |
|---|---|---|
| `--titlebar-height` | 32 | Window chrome |
| `--tabbar-height` | 40 | Top tabs strip |
| `--sidebar-width` | 280 | Sidebar column (min 264, max 320 if resizable) |
| Game row height | 36 | Sidebar GAMES list |
| Env row height | 32 | Sidebar ENVIRONMENTS list + welcome diagram rows |
| Icon button | 22 (sidebar) / 28 (header) | Delete/close |
| Control / secondary button | 34–36h, 12–18px padding | |
| Primary CTA | ≥42h, 12×28 padding | Welcome / modal confirm |
| Section header height | 48 (GAMES header: 14+14 padding = 42 visual, 48 hit area) | |
| Panel inner padding | 12–16 | Lists, cards |
| Modal padding | 24 | |
| Gaps | 4 between rows, 6 between env rows, 8 between list+button, 12 divider margins, 16 card padding, 24 major section gaps | |

Sidebar is now **two stacked scroll regions** (see §8) — not one long list. Divider between them is a 1px hairline + 12px air.

---

## 5. Border radius

| Token | px | Use |
|---|---|---|
| `--radius-sm` | 6 | Env rows, small inputs |
| `--radius` | 8 | Buttons, inputs, game rows, search field |
| `--radius-md` | 10 | Proxy add form, catalog cards |
| `--radius-lg` | 12 | Sidebar sections, welcome diagram card |
| `--radius-xl` | 16 | Modals, empty-state cards, welcome inner |
| `--radius-pill` | 999 | Badges, count pills, kbd-adjacent chips |

Logo/tile thumbnails: 4px (titlebar) / 6px (game row thumb) / 16px (welcome mark).

---

## 6. Shadow / elevation

No drop shadows on rows or chrome — elevation is **lightness + 1px border**. Shadows only on *floating* layers:

| Level | Shadow | Use |
|---|---|---|
| L0 — Flat | none | App bg, sidebar shell, rows, inputs resting |
| L1 — Chrome | none (1px `border-subtle` line only) | TitleBar bottom edge, sidebar right edge, section divider |
| L2 — Hover card | Subtle only on modals: `0 4px 16px rgba(0,0,0,.3)` on catalog card hover | |
| L3 — Floating | `0 20px 48px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.05)` | Welcome inner, empty-state cards |
| L3m — Modal | `0 24px 64px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06)` + `0 0 0 1px rgba(255,255,255,.04) inset` | `.modal` |
| L4 — Selection tie | `inset 0 -2px 0 var(--accent)` on active tab (visually welds tab to workspace) | |
| L4b — Selection bar | `3px left-bar #6366F1 + 0 0 8px var(--accent-ring)` on active env row | |

Browser host (`workspace-active`) must stay `background: transparent` so the native `WebContentsView` shows through — no overlay blur on live views.

---

## 7. Icon style

- **Library spirit:** Lucide / Heroicons outline. **SVG only**, `stroke="currentColor"`, `fill="none"` (or `fill="currentColor"` for tiny solid dots), `stroke-linecap="round"`, `stroke-linejoin="round"`.
- **Stroke width:** 1.2–1.4 (12–16px icons), 1.3 for game-folder, 1.4 for close-X.
- **Sizes:** titlebar 10–11, sidebar row 12–14, section icons 14, empty-state 16–20, settings gear 16. Never scale an icon via `width/height` that distorts its viewBox.
- **Color:** inherits `currentColor` from parent text. Active/hover relies on text color change, not icon recolor.
- **No emoji.** No filled app icons as UI glyphs. Status dots are the only solid fills.
- **Hit areas:** 22×22 min (row delete), 28×28 (header +), 46px (titlebar window controls). Use invisible padding if glyph < hit area.

---

## 8. Component specs — exact developer contract

### 8A. Sidebar (`280 × 100% - titlebar`, `bg --bg-sidebar`, right `1px --border-subtle`)

```
┌──────────────────────────────┐
│ [Search]                     │  10px margin block, 12px LR padding
│ ─ GAMES ───── [+ ]  4·12     │  header 14px 16px LR, 48h
│  Game rows (scroll region 1) │  8px padding, 4px gap
│ ──────────────────────────── │  divider 1px --border-subtle
│ ─ ENVIRONMENTS ── [+ Env]    │  header 14px LR, sub-label = selected game name + count
│  Env rows (scroll region 2)  │  8px padding, 6px gap
│ ──────────────────────────── │
│  [⚙ Settings — PROXY]       │  footer 12px pad, top 1px rule
└──────────────────────────────┘
```

**Search bar**
- Container: `padding 0 12px`, `border-bottom 1px --border-subtle`, `flex-shrink 0`.
- Icon: absolute `left 22px`, `14×14`, `color --text-dim`, `pointer-events none`.
- Input `.sidebar-search-input`: `width 100%`, `bg --bg`, `1px --border`, `radius 8`, `font 13 Inter`, `color --text-secondary` (focus→`--text`), `caret --accent`, `padding 8px 32px 8px 32px`, `margin 10px 0`. Hover → `--border-strong`. Focus → `--accent` border + `0 0 0 3px --accent-ring`. Placeholder `--text-dim`. Clear button `20×20`, `radius 4`, `bg --surface` + `--border` hidden until query.
- A11y: `aria-label` on input, `role="search"` wrapper, live region for result count.

**GAMES section**
- Header row `48h`: left label `GAMES` (`10/700 caps +0.12em --text-dim`) + center/trailing `games·envs` count pill + trailing `+` button. Header `padding 14 14 14 16`, `border-bottom 1px --border-subtle`.
- Count pill: `font 11/600 mono tabular-nums`, `color --text-dim`, `bg --surface`, `1px --border`, `2px 6px`, `radius 999`, `line-height 1`.
- Add button `.sidebar-add-btn`: `28×28`, `bg --surface`, `1px --border`, `radius 8`, `icon 12×12 +1.6 stroke`. Hover: `bg --surface-hover`, `--border-strong`, `--text`, `translateY(-1px)`. Active: `translateY(0)`.
- List: `flex: 1 to 0.52ish` (see CSS: `flex: 1 1 42%` min-height 120), `overflow-y auto`, `padding 8`, `gap 4`, scrollbar `4px` thumb `--border`.
- **Game row** `36h` (was 40; tightened for split density):
  - Layout: `flex gap 10`, `padding 10 10 10 12`, `radius 8`, `min-height 36`, `border 1px transparent`.
  - Elements: thumb `24×24 radius 6 bg --surface 1px --border` (catalog `img cover` or folder glyph `#A1A1AA`), name `13/600 Inter --text-muted` (selected→`--text`), count badge `11/600 mono pill` (selected→`--accent-dim` tint if desired, spec says `--surface` pill), trailing delete `22×22` (hover-only, danger tint).
  - **States:**
    - Rest: transparent, name `--text-muted`.
    - Hover: `bg --surface`, thumb border `--border-strong`, name `--text-secondary`, delete `opacity .7`.
    - **Selected (scoped route):** `bg --surface-2`, `border --border`, `inset 0 0 0 1px --border` is not needed — spec: `bg --surface-2` + left accent bar `3px --accent + 0 0 8px --accent-ring` at `left -4 top 5 bottom 5`; name `600→700` + `--text`, count pill emphasized if needed. (Indigo = "you are here".)
    - Active (pressed): `bg --surface-2`.
    - Empty: centered icon tile `44×44 radius 12 bg --surface 1px --border` + two-line text (`13/600 --text-secondary` + `12/400 --text-muted`), padding `40 16`.

**ENVIRONMENTS section** (the key hierarchy change)
- Header: `padding 14 16`, `border-top 1px --border-subtle` (divider), `border-bottom 1px --border-subtle`, `48h`, `bg --bg-sidebar`.
  - Left: stack label `ENVIRONMENTS` (`10/700 caps --text-dim`) + subtitle `SelectedGame — 3` (`11/600 mono --text-muted` tabular-nums). When no game selected: subtitle = `Select a game` (`11 italic --text-dim`).
  - Count: same pill style as games.
  - Trailing: `+ Add Environment` — `28×28` icon button same as Add Game. **Disabled** when no game selected: `opacity .35`, `cursor not-allowed`, `pointer-events none` is wrong for a11y → use `disabled` attr, no elevation.
- List: `flex: 1 1 58%` (larger than GAMES since it is the action target), `padding 8`, `gap 4–6`, `bg transparent`. When no game selected: show centered placeholder: `icon 36×36 radius 8 --surface + --border`, title `13/600 --text-secondary "No game selected"`, desc `12/400 --text-muted "Choose a game above to see its environments."`, min-height to fill. When game selected but zero envs: same but "No environments yet" + `Add environment` ghost row affordance.
- **Env row** `32h`:
  - Layout: `flex gap 10`, `padding 0 8 0 12`, `margin 0 4`, `height 32`, `radius 6`, `border 1px transparent`.
  - Elements L→R: **live dot 7px** → name → spacer → **proxy dot 7px** → launch chevron `20×20` + delete `22×22` (both hover-reveal).
  - Name: `12.5/500 mono --text-secondary`, truncated `ellipsis`.
  - Live dot `.env-dot` `7×7 radius 50% bg --text-faint` + inset. `.open` → `bg --green` + `0 0 0 3px --green-dim + 0 0 8px --green-glow`; if proxy assigned and live → dot wears proxy color (`bg proxy + 0 0 8px proxy66`) — spec preserves that prior behavior (live+proxy = identity overrides green).
  - Proxy dot `.env-proxy-dot` `7×7` `bg proxy / color proxy` + `0 0 6px currentColor`, shown trailing only when idle-or-not-worn-on-live-dot (spec: if live dot already shows proxy, the trailing proxy dot is redundant → hide to avoid double). Idle envs show separate proxy dot.
  - **States:**
    - Rest: transparent.
    - Hover: `bg --surface`, `border --border-subtle`, `launch + delete opacity .7 → 1 on self`.
    - **Active (selected env, i.e., browser foreground):** `bg --surface-2`, `border --border`, `inset 0 0 0 1px --border` + left-bar `3px --accent`. Name `--text` + `500`. (Distinct from live: you can be active+live, active+idle, idle+inactive, etc. Active is always indigo bar; live is always dot color.)
    - Live but not active: dot green/proxy, no left bar.
    - Rename (inline): not required spec but retained as double-click addon → input `1px --accent` + `0 0 0 3px --accent-ring`, mono 12.5/500.
  - Ghost add: `.add-env-btn` `height 32`, `border 1px dashed --border`, `radius 6`, `font 11.5/500 mono --text-muted`, `padding 0 10 0 12`. Hover: `solid`, `border --accent`, `bg --accent-dim`, `color --text-secondary`.

**Sidebar footer**
- Container `12px pad`, `border-top 1px --border-subtle`, `bg --bg-sidebar`.
- Button `.settings-btn`: `flex gap 10`, `width 100%`, `padding 10 12`, `radius 8`, `1px transparent`, `font 13/500 Inter --text-muted`. Hover `bg --surface / --border / --text`. Right-aligned `PROXY` kicker `10/700 mono --text-dim +0.04em`.

### 8B. Top Tab Bar (`40h`, `bg --surface`, `border-bottom 1px --border-subtle`, `gap 1`, scrollx)

- Layout: `height --tabbar-height (40)`, `display flex align stretch`, `bg --surface`, `border-bottom 1px --border-subtle`, `gap 1`, `overflow-x auto scrollbar none`, preview hidden.
- Null state: when `tabs.length===0` component returns `null` → no bar (workspace top aligns to `TITLEBAR_HEIGHT`). Workspace bounds calc must still reserve 40px always (existing `getWorkspaceBounds` does `TITLEBAR+TABBAR`).
- **Tab** `min 152 max 220 flex-shr 0`, `padding 0 12 0 14`, `gap 8`, `border-right 1px --border-subtle`, `font 12.5 mono --text-muted`, `bg transparent`.
  - Elements: green live dot `6×6 radius 50% bg --green + 0 0 6px --green-dim` + optional `proxy-dot 7×7` `+2px left` → label flex `gap 4 baseline`: `game frag 12.5/600 Inter` + sep `·` `10 --text-faint` + `env frag 12/400 mono --text-muted` → close `20×20 radius 4 1px transparent --text-dim`.
  - **States:**
    - Rest / inactive: `--text-muted`, transparent bg.
    - Hover: `bg --surface-2`, `--text-secondary`.
    - **Active:** `bg --surface-hover`, `--text` (game frag `--text`, env frag `--text-secondary`), `box-shadow inset 0 -2px 0 var(--accent)` (welds to workspace). Dot glows stronger (`0 0 8px --green-glow`).
    - Close: `opacity 0` resting, `opacity .7` on tab hover/active, `opacity 1 + danger tint` on self-hover (`color --danger / bg --danger-dim / border rgba(239,68,68,.2)`), active-press `scale .92`.
  - Overflow: horizontal scroll (wheel + drag), no wrap, no shrink <120.

### 8C. Main Workspace

- Container `.main-area` `flex 1 column`, `bg --bg-workspace`, `min-width 0`, `overflow hidden`.
- **Dot grid backdrop** (only when no browser): `bg-color --bg-workspace + radial rgba(39,39,42,.6) 1px transparent 1px size 22px`. Overlay radial vignette `ellipse 75% 70% transparent 25% → --bg-workspace 85%`. When `hasActiveBrowser` render `.workspace-active` = `background transparent !important; background-image none` so the native `WebContentsView` shows through; `display none` on pseudo.
- **Empty states (3 tiers):**
  1. **First-run (`games.length===0`) → Welcome** (see `pages/welcome.md`): centered card `520×auto max-w 520 pad 40 36 32 radius 16 bg --surface 1px --border shadow L3`. Inside: 64 logo tile + 26 H1 + 13.5 subtitle + primary CTA 42h + `⌘N` kbd hint + model diagram (`Game card → tree 44×114 branches → 3 env rows` replica) + footnote 12.5 `--text-secondary` + legend dots. Staggered rise 40ms steps.
  2. **Game selected but no env open / no browser (`!hasActiveBrowser && games.length>0 && selectedGameId`):** show `.ws-hint-card` variant `520 max-w pad 32 28 28 radius 16 bg --surface 1px --border shadow L3` (was 360). Content: icon `44 radius 10 bg --surface-2 1px --border color --text-dim` (20-glyph), title `15/700 --text` (was 14/600), desc `13/400 --text-muted line 1.6` (was 12.5), kbd tip `11 mono --text-dim + kbd pills`. Title = `Select an environment — <GameName>` or `Select a game`. Desc: "Choose an environment in the lower pane…" / "Add an environment…" — unified 520 to match Welcome.
  3. **No game selected (`!selectedGameId && games.length>0`):** same card but icon = folder glyph, title `Select a game`, desc `Pick a game on the left to see its environments below. Each game keeps its own isolated identities.`
- **Browser container:** `.workspace` / `.workspace-active` `flex 1 position relative center`, height 100%; the real content is the Electron `WebContentsView` overlayed at `{ x: SIDEBAR_WIDTH, y: TITLEBAR+TABBAR, w: innerWidth-SIDEBAR, h: innerHeight-TITLEBAR-TABBAR }` — never animates geometry (no transition on bounds); workspace itself has no padding/border when active.

### 8D. Window / TitleBar / Density

- **Window:** `app` `flex column 100vh/100vw hidden bg --bg`. `app-body` `flex 1 hidden row`.
- **TitleBar** `32h bg --bg-sidebar border-bottom 1px --border-subtle drag`:
  - Left cluster `.titlebar-drag` `flex 1 0 16 gap 10`: logo mark `18×18 radius 4 bg linear(#1F1F23→#27272A) 1px --border inset 0 1px 0 rgba(255,255,255,.06)` (16×16 image cover) + title `SILO` `11/700 +0.14em caps --text-muted` + `BETA` pill `9/700 mono +0.08em --text-dim / --surface / 1px --border 2px 5px radius 4`.
  - Right controls `46px` each `stretch` `bg none 1px none --text-muted`: hover `--surface-hover/--text`, close hover `--danger/#fff`. `-webkit-app-region: no-drag`.
  - Z-index 100, drag region full bar except controls.
- **Density:** compact-pro (density 8). Title 32 / tabs 40 / game 36 / env 32 / buttons 28–42. Section chrome generous (12–16 pad), rows dense (4–6 gaps). Overall padding air kept at panel heads (12–16) and list inset (8) — not wasted on row height.
- **Resizing:** `activeEnvId && !modal` triggers `window.silo.resizeBrowser(activeEnvId, getWorkspaceBounds())` on `resize` — bounds always `SIDEBAR(280) × TITLEBAR(32)+TABBAR(40)`.

### Buttons (global)
- `.btn-primary` inverted white, `9×18` (modal) / `12×28` (welcome), 42min CTA, `radius 8`, `scale/lift` hover, disabled `.35 opacity not-allowed`.
- `.btn-secondary` transparent + `1px --border` + `--text-secondary`, hover `--surface-hover/--text/--border-strong`.
- `.icon-btn` `22×22 radius 4 transparent`, opacity-guarded hover reveal, danger variant.

---

## 9. Motion

Easing `cubic-bezier(0.16,1,0.3,1)`; `150ms fast / 200 normal`. Stagger lists `30–60ms` `opacity 0→1 + y 8→0`. Hover lifts only on cards/CTAs. Modals `overlay-in 200` + `scale .96→1 y 8`. Active tab bar excluded from motion (layout-thrash risk). Reduced-motion global kill already wired.

---

## 10. Anti-patterns (hard no)

Emoji as icons · gray-on-gray (<4.5:1) · color-only status · hover-only affordance no keyboard · filled color primaries vs status · glassmorphism over live BrowserViews · animating view host geometry · fake metrics in empties · mixing lightness/shadow elevation · single duration for all · removing focus rings.

---

*Last validated 2026-08-25 against `src/renderer/src/{App,components/*,assets/*}`. v2 IA: GAMES (top) → filtered ENVIRONMENTS (bottom).*
