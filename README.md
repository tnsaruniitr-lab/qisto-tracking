# Qisto build tracker

Live development progress dashboard for [Qisto](https://github.com/tnsaruniitr-lab/qisto) — BNPL for Syria.

**Live page**: https://tnsaruniitr-lab.github.io/qisto-tracking/

## How the data flows

Three layers, freshest first:

1. **Live (every page load)** — the commit feed and "components touched" fetch the last 24h of commits straight from the GitHub API in the browser. If the API is rate-limited, the page falls back to the baked snapshot and says so.
2. **Baked (hourly)** — [`bake.yml`](.github/workflows/bake.yml) runs [`scripts/bake.mjs`](scripts/bake.mjs) on a schedule, computing per-component file stats, line totals, 30-day velocity, and the 7-day contributor split into [`data/stats.json`](data/stats.json).
3. **Curated (per work session)** — [`data/status.json`](data/status.json) holds milestone progress, the money-loop status, audit findings, design decisions, the weekly changelog, and roadmap. Edit this file to update those sections; no code changes needed.

## Structure

```
index.html              the dashboard
assets/style.css        dark ink theme
assets/app.js           data loading + rendering
data/status.json        curated content (edit me)
data/stats.json         baked stats (generated, do not edit)
scripts/bake.mjs        stat generator
.github/workflows/      hourly bake schedule
screenshots/            product gallery images
```
