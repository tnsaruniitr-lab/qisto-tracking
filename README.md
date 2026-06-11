# Qisto build tracker

Live development progress dashboard for [Qisto](https://github.com/tnsaruniitr-lab/qisto) — BNPL for Syria.

**Live page**: https://tnsaruniitr-lab.github.io/qisto-tracking/

## How the data flows

Three layers, freshest first:

1. **Live (every page load)** — the commit feed and "components touched" fetch the last 24h of commits straight from the GitHub API in the browser. If the API is rate-limited, the page falls back to the baked snapshot and says so.
2. **Baked (hourly)** — [`bake.yml`](.github/workflows/bake.yml) runs [`scripts/bake.mjs`](scripts/bake.mjs) on a schedule, computing per-component file stats, line totals, 30-day velocity, and the 7-day contributor split into [`data/stats.json`](data/stats.json).
3. **Curated (per work session)** — [`data/status.json`](data/status.json) holds workstream progress, the money-loop status, design decisions, the weekly changelog, and the roadmap lanes. Edit this file to update those sections; no code changes needed.
4. **Daily reviews** — each day's independent audit goes in `data/reviews/YYYY-MM-DD.json` (scorecard dimensions, what's great, issues, verdict, five things next — see [`2026-06-11.json`](data/reviews/2026-06-11.json) for the format). Append the date to [`data/reviews/index.json`](data/reviews/index.json). The page renders the latest review in full and builds the score trend from the whole archive.

## Progress model

The headline % is a weighted average over workstreams in `status.json`. A workstream only reaches 100% when it is **shipped, audited and production-ready** — testing and rework are priced into each number rather than appended at the end. When scope grows (a redesign, a new feature lane), add or reweight workstreams and note it in `scopeNote`; the overall % is allowed to go down, and the page says why.

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
