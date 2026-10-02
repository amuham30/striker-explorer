# Contributing

Install dependencies with `npm ci`, then start the app with `npm run dev`.

Place files according to the [repository guide](docs/repository-guide.md). Keep changes focused and explain any changes to scoring or source data.

Before submitting a change, run:

```bash
npm run typecheck
npm run lint
npm run build
```

For UI changes, check the affected flow in a browser at desktop and mobile widths. Check loading, empty, and error states where relevant. Include screenshots for visible changes and report any checks you could not complete.

Do not commit credentials, raw scraping caches, local backups, or generated build output. Dataset changes should describe the source, snapshot scope, and effect on player coverage.
