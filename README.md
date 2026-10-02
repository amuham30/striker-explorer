# Striker Explorer

A football scouting dashboard for browsing players, comparing seasons, and exploring performance alongside market value.

[Features and scoring](docs/project-guide.md) · [Repository guide](docs/repository-guide.md) · [Design system](docs/design-system.md) · [Contributing](CONTRIBUTING.md)

## What you can explore

| View | What it does |
| --- | --- |
| Player browser | Filter by season, league, club, position, age, value, and minutes. |
| Player profiles | Explore season statistics, percentiles, career history, and age curves. |
| Compare | Compare up to four player and season combinations on a radar chart. |
| Value map | Plot market value against position-based Impact Scores. |
| Barça fit | Browse transfer-target fit rankings. |
| Ballon d’Or | Explore a historical timeline. |

The included snapshot covers a 4,256-player pool across ten leagues, with historical season views from 2014/15 to 2024/25. Coverage varies by league, season, and metric; missing statistics are skipped when calculating Impact Scores.

## Project progress

The project began as an analysis of best-value strikers: compare performance per euro and use Robert Lewandowski's 2024/25 season as a benchmark. It has grown into a scouting app for all positions. Position-based Impact Scores now drive performance comparisons, while the browser also retains a value-for-money metric from the original valuation pipeline.

### What is done

| Area | Delivered |
| --- | --- |
| Data collection and export | Cached collection pipeline, player matching, per-90 metrics, valuation calculations, and committed app datasets. The collection scripts live in the local workspace outside this repository. |
| Ten-league player pool (W12) | 4,256 players across the five major European leagues, Brasileirão, Primeira Liga, MLS, Belgian Pro League, and EFL Championship. |
| Position-aware scoring (W10, W14) | FIFA-style position labels, preferred-foot and side enrichment where available, and Impact Scores using separate attacking, midfield, defensive, and goalkeeper statistics. |
| Historical seasons (W11, W15) | Season switching, career panels, season-specific percentiles, player-by-season comparisons, and age-curve reference data. Historical coverage varies by source. |
| Player browser (W2, W16e) | Search, sorting, custom league/club/position/season filters, age/value/minutes ranges, a responsive table, and pagination below the results. |
| Comparison and value analysis (W3, W4, W9) | Up to four player-season slots, configurable radar axes, and a dedicated market-value-versus-Impact scatter plot. |
| Player profiles and scouting views (W5, W7, W8) | Profile statistics and percentile panels, shot information where available, Barça transfer-target rankings, and a Ballon d'Or timeline. |
| Interface polish (W10d–W10f, W16e) | Club badges and league logos, shared dark-theme tokens, metric explanations, and the table-only browser with a filter sidebar. |

### What is planned next

- [ ] **Finish competition coverage (W13, partial).** Add cup and European competition statistics and a competition selector on player pages. Keep Impact scoring league-based.
- [ ] **Add data-availability labels (W13).** Explain which sources and metrics are available for each player and competition, including missing xG and limited historical coverage.
- [ ] **Build event-data analysis (W17, queued).** Use StatsBomb Open Data with penaltyblog to match covered player-seasons and produce touch heatmaps, coordinate-based shot maps, expected-threat metrics, and team Elo context. Show the panel only for players with coverage and include source attribution.

W17 starts with a cached match index and player matching guarded by team and identity. Its planned acceptance checks include event panels for at least three covered players, spot-checked shot counts, and no changes to the existing Understat/SofaScore pipelines.

### Longer-term ideas

- Infer player roles from spatial footprints and use them for fit scores and similar-player discovery.
- Expand historical coverage for players sourced from the five added leagues.
- Explore youth-league statistics and historical market-value snapshots when suitable sources are available. Academy collection was explored, but broad senior-performance coverage was unavailable.

This progress summary draws on the workspace's `prompt.md` and `roadmap.md`, reconciled with the current app. Phase labels refer to those planning notes; planned work has no committed release date. The historical cards view, KPI strip, and top-five podium were removed in W16e and are not part of the current browser.

## Run locally

Use Node.js 20.9 or newer and npm. The runtime datasets are included, so starting the app does not require scraping data or configuring API keys.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000).

```bash
npm run typecheck   # TypeScript checks
npm run lint        # ESLint
npm run build       # Production build
npm run start       # Serve the production build
```

## Repository layout

```text
striker-explorer/
├── src/
│   ├── app/          # Next.js routes and API handlers
│   ├── components/   # Scouting views and chart components
│   └── lib/          # Scoring, player types, and shared helpers
├── data/             # Six committed runtime JSON datasets
├── public/           # Badges, logos, and static assets
├── scripts/          # Dataset enrichment and diagnostic utilities
├── docs/             # Feature, architecture, and design references
└── .github/          # Pull request template
```

Next.js 16, React 19, TypeScript, and Tailwind CSS 4 power the app. Charts use Recharts and a vendored Visx chart kit; animation uses Anime.js and Motion.

## Data and scoring

Statistics come from Understat and SofaScore; market values come from Transfermarkt. These are committed snapshots, not a live feed. Source data and club imagery remain subject to their respective owners’ terms.

Impact Scores use position-specific weights and percentile pools. They help compare players within a position group; they are not a universal rating across every role. See the [scoring guide](docs/project-guide.md#impact-score) for weighting and identity rules.

The Python collection pipeline lives in the surrounding local workspace and is not included in this app repository. See the [repository guide](docs/repository-guide.md) before running data scripts.
