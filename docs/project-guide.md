# ⚽ Striker Explorer

A dark-theme soccer scouting dashboard covering the **top 10 leagues** — browse a 4,256-player pool by league, club, position, value and **season (2014/15–2024/25)**, rank by a position-specific **Impact Score**, compare players head-to-head, and dig into per-player spec sheets.

> Data: Understat (per-90 stats + shot-level xG) & Transfermarkt (market values) for the top-5 leagues; SofaScore completed seasons for BRA/POR/MLS/BEL/ENG2.

## Features

- **Browse** (`/`) — filter sidebar with custom SoFIFA-style dropdowns (position with counts, season, league, club — all with logos/crests), gold dual-range sliders (Age / Value €M / Minutes) with editable min–max boxes, table with responsive column tiers, bottom-only pagination. Sort by any column; season switcher swaps the whole dataset.
- **Compare** (`/compare`) — up to 4 player×season slots on a recharts radar (5–7 axes, normalized 0–100 vs. the pool's 99th percentile — outlier-robust). Polygons **morph smoothly** when you add players or toggle axes. Tooltip shows raw per-90 values.
- **Value Map** (`/value-map`) — every valued player (450+ minutes) plotted market value × Impact, bubble = minutes. Bargain quadrant upper-left. Position-group toggles, click-through to players.
- **Ballon d'Or** (`/ballondor`) — historical timeline.
- **Barça Fit** (`/barca`) — transfer-target fit ranking, excludes current Barça players.
- **Player sheets** (`/player?p=…&id=…`) — season-aware spec sheet: Impact hero, percentile tiles, career panels, age-curve chart vs. the pool.

### Impact Score

Percentile-based, **per position group** (ATT/MID/DEF/GK) with per-position weights: ST/W finishing-heavy, mids blend creation + ball-winning, CBs/FBs on defensive work + availability, GKs on shot-stopping. Missing stats are skipped and weights renormalized. Bulk scoring (`computeImpactBulk`) builds pools once per group for tables.

> **Identity rule:** 41 duplicated names exist in the pool — players are always resolved by `(name, team)` / `(name, id)`, never by name alone.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + React 19 + Tailwind CSS 4
- **recharts** (radar, scatter) · **@visx** vendored kit (`src/components/charts/`) for the age-curve line chart
- **animejs** (count-ups) · **motion** · **lucide-react**
- Data pipeline (Python, local workspace parent; not included in this repository): Understat/SofaScore scrapers, Transfermarkt values, percentile & history builders

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

> The app reads JSON datasets from `data/` at request time (`strikers.json`, `history_compare.json`, `history_percentiles.json`, `history.json`, `age_curve.json`). Those are committed so the app runs out of the box.

```bash
npm run build      # production build
npm run start      # serve the build
npm run lint       # eslint
```

## Project structure

```
webapp/
├── src/
│   ├── app/            # routes: / /compare /value-map /barca /ballondor /player /api/history
│   ├── components/     # browse-table, compare-view, player-detail, value-map, …
│   │   ├── charts/     # vendored visx line-chart kit (age curve)
│   │   └── kokonutui/  # shimmer-text
│   └── lib/            # impact.ts (Impact Score), history.ts, positions.fifa.ts, team-badges.ts
├── data/               # runtime datasets (JSON) + pipeline outputs
└── public/             # club badges, league logos, shot maps
```

## Design system

Dark "broadcast graphics" identity — gold/blau/garnet tokens defined in `src/app/globals.css` as the single source of truth; see `docs/design-system.md`. UI laws: no horizontal scroll, no truncated text (short names instead), no native selects, no KPI strips/podiums.

