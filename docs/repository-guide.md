# Repository guide

## Where files belong

- `src/app/`: routes, layouts, and API handlers.
- `src/components/`: reusable UI and scouting views. The `charts/` directory contains the vendored Visx kit.
- `src/lib/`: shared types, scoring logic, positions, history readers, and utilities.
- `data/`: application snapshots read by server routes using the repository working directory.
- `public/`: assets served directly by Next.js.
- `scripts/`: Python enrichment and diagnostic utilities.
- `docs/`: explanatory documentation. Keep the root README focused on the project and getting started.

Framework configuration files stay at the repository root so Next.js, TypeScript, ESLint, and the component generator can discover them.

## Runtime datasets

| File | Purpose |
| --- | --- |
| `strikers.json` | Main player pool and metrics |
| `history.json` | Career history |
| `history_browse.json` | Historical browser seasons |
| `history_compare.json` | Historical comparison metrics |
| `history_percentiles.json` | Historical percentile reference data |
| `age_curve.json` | Age-curve reference data |

Run npm commands from this repository root. Moving the runtime data directory requires updating server-side readers.

## Local collection workspace

The local parent folder contains Python modules in `src/`, raw and processed source data in `data/`, a virtual environment, and archived planning notes in `docs/planning/`. These are outside this Git repository.

`derive_foot_side.py` can use cached sources from that parent workspace and rewrites `data/strikers.json`. Review the dataset diff before committing. The diagnostic script `check_age_curve.py` reads committed snapshots and checks a running development server; it does not collect data.

Keep raw scraping caches, backup datasets, virtual environments, and browser session artifacts out of this app repository.
