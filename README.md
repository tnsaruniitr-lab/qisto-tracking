# Qisto build tracker

Live development progress dashboard for [Qisto](https://github.com/tnsaruniitr-lab/qisto) — BNPL for Syria.

**Live page**: https://tnsaruniitr-lab.github.io/qisto-tracking/

## How the data flows

Three layers, freshest first:

1. **Live (every page load)** — the commit feed and "components touched" fetch the last 24h of commits straight from the GitHub API in the browser. If the API is rate-limited, the page falls back to the baked snapshot and says so.
2. **Baked (hourly)** — [`bake.yml`](.github/workflows/bake.yml) runs [`scripts/bake.mjs`](scripts/bake.mjs) on a schedule, computing per-component file stats, line totals, 30-day velocity, and the 7-day contributor split into [`data/stats.json`](data/stats.json).
3. **Curated (per work session)** — [`data/status.json`](data/status.json) holds workstream progress, the money-loop status, design decisions, the weekly changelog, and the roadmap lanes. Edit this file to update those sections; no code changes needed.
4. **Roadmap (hourly)** — the bake also reads [`productroadmap.md`](https://github.com/tnsaruniitr-lab/qisto/blob/main/productroadmap.md) from the qisto repo. Items drive the roadmap lanes; items **added after the scope baseline** automatically dilute the matching workstream's % (effort-weighted: S≈1 M≈3 L≈8 XL≈15 pts), and unknown component names spawn a new category row on the page.
5. **Daily reviews** — each day's independent audit goes in `data/reviews/YYYY-MM-DD.json` (scorecard dimensions, what's great, issues, verdict, five things next — see [`2026-06-11.json`](data/reviews/2026-06-11.json) for the format). Append the date to [`data/reviews/index.json`](data/reviews/index.json). The page renders the latest review in full and builds the score trend from the whole archive.

## Progress model

The headline % is a weighted average over workstreams in `status.json`, with two honesty mechanisms on top:

- **20% test & rework buffer** — every bar reserves its final 20% (hatched on the page). Build progress contributes at most 80%; the buffer only fills when the stream is marked `tested: true` after production verification. Milestones use four states: not started → in progress → testing → tested & live.
- **Automatic scope dilution** — open `productroadmap.md` items dated after `scopeBaseline` reduce the matching workstream: `effective = pct × baseEffort / (baseEffort + pendingPoints)`. The overall % is allowed to go down when scope grows, and the page says why.

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
