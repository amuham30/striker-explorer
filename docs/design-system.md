# DESIGN_SYSTEM.md — Striker Explorer

**Identity:** elite scouting dashboard × broadcast graphics. Dark, data-dense-but-calm.
Single source of truth for tokens: `src/app/globals.css` (`@theme` block).
Every component consumes tokens only — no raw hex in markup.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#06060b` | page base (never pure black) |
| `panel` | `#0d0d16` | raised surface |
| `panel-2` | `#13131f` | highest surface / hover |
| `line` | `#212130` | hairline borders |
| `line-strong` | `#34344a` | emphasized borders, bar tracks |
| `ink` | `#f2f2f7` | primary text (15.9:1 on canvas) |
| `ink-dim` | `#b7b7c7` | secondary text (8.6:1) |
| `ink-mute` | `#87879b` | tertiary text (4.9:1) |
| `ink-faint` | `#5f5f74` | decorative/disabled only |
| `garnet` | `#c81e63` | Blaugrana crimson, lifted for AA on dark |
| `blau` | `#4d82d9` | Blaugrana blue, lifted for AA on dark |
| `gold` | `#edbb00` | brand accent — scores, active nav, focus ring |
| `good` / `bad` / `info` | `#34d399` / `#f87171` / `#93c5fd` | positive/negative/neutral deltas |

Contrast pairs verified AA (≥4.5:1) on canvas & panel. Raw brand hexes
(#a50044, #004d98) intentionally NOT used as text colors — decorative only.

## Typography
- Body/UI: **Geist** (`--font-sans`), base 14–16px, line-height 1.5.
- Display headers: **Oswald** (`font-display`), uppercase + wide tracking, broadcast feel.
- ALL numbers: `tabular-nums` — no layout shift while counting up.

## Spacing rhythm
Page padding `py-8 md:py-12`, container `max-w-7xl`. Panels pad `p-5`.
Card grids gap-4; section stacks space-y-5/6. 4px base grid.

## Radius & elevation
Radius scale from shadcn vars (--radius 0.75rem). Depth comes from layered
surfaces (canvas → panel → panel-2) plus ONE fixed ambient glow per corner
in body background-image — no drop-shadow noise.

## Components
`.panel` surface · `.panel-hover` 180ms border/bg lift · `.field-input` inputs/selects ·
`.btn-pag` pagination buttons · `.th-head` sticky translucent table header ·
`.stagger` parent = children rise with 50ms stagger · `.animate-rise` single entrance.

## Motion rules
One easing family: `--ease-snap` `cubic-bezier(0.16,1,0.3,1)`.
Entrances ≤300ms, stagger ≤50ms. Count-ups only where the value is meaningful
(compare cards, via anime.js, already reduced-motion sensitive? CSS fallback
covers global animations). `prefers-reduced-motion: reduce` globally neuters
animation/transition/scroll-behavior.

## Accessibility contract
- Gold `:focus-visible` outline everywhere (2px, offset 2px).
- Active nav carries `aria-current="page"`.
- Decorative glyphs (`◆ 🏅 🔵🔴`) wrapped or marked `aria-hidden` where inline.
- Every glass-like translucency sits on a dark base or declares its own bg
  (past readability lesson).

## Routes sharing this system
`/` Browse · `/compare` · `/player` · `/barca` · `/ballondor` (gold timeline spine).
