# Revilla Trails

Working name for the Ketchikan Trail Association — a static, prerendered site for connecting the
trails on Revillagigedo Island. Every existing and proposed segment is mapped, status-coded, and
carries the land managers who own the ground under it.

**First project: walking routes to the Patching Lake and Heckman Lake cabins.** Three Forest
Service cabins sit up the Naha country and only one can be reached on foot. The route is being
walked and flagged now; nothing gets cut before a finished survey and a NEPA environmental
analysis with the Ketchikan–Misty Fjords Ranger District.

Phase 1 has **no donate button**. The group is informal: no entity, no bank account, no 501(c)(3).

## Stack

- Astro (React islands) + Tailwind v4
- MapLibre GL JS 5, USGS National Map tiles (`USGSTopo` / `USGSImageryTopo`)
- Committed GeoJSON, built by scripts — nothing fetches at runtime

## Commands

```bash
npm install
npm run data          # fetch public GIS layers, then build the network
npm run data:build    # rebuild from data/raw + data/proposed
npm run og            # regenerate Open Graph cards into public/og/
npm test              # schema, transform, and committed-dataset contract tests
npm run dev
npm run build
```

Swap the public name in `src/config/site.ts`. It is used everywhere.

### Before you ship

Set the real supporter count in `data/supporters.json`. It ships as `null`, which makes the
site ask people to sign on without claiming a total. **Do not invent a number** — an honest
count is the entire Phase 1 argument, and a fabricated one is what loses a Forest Service
meeting.

## Data

| Path | Role |
|---|---|
| `scripts/fetch-sources.ts` | Pull USFS NFS trails, USFS ownership + forest boundary, Alaska DNR ownership, KGB tax parcels |
| `scripts/build-network.ts` | Clip, dissolve, intersect land managers, measure elevation, validate with zod |
| `scripts/build-og.ts` | Render per-segment and per-corridor Open Graph cards |
| `scripts/lib/transform.ts` | Pure transforms (unit tested) |
| `scripts/lib/elevation.ts` | USGS 3DEP elevation sampling |
| `data/proposed/` | Hand-drawn connectors and approximate municipal trails |
| `data/corridors.json` | Named priority routes |
| `data/overrides.json` | Status, copy, and include/exclude per segment |
| `data/elevation-cache.json` | Committed 3DEP cache; makes offline rebuilds deterministic |
| `public/data/network.geojson` | Build output, committed |

`data/raw/` is gitignored and regenerable (~17 MB). `build-network` refuses to run without it
so a partial rebuild cannot quietly overwrite the committed network; pass `--allow-partial`
if you really mean to. Pass `--no-elevation` to stay offline — cached elevations are still
reused.

Source endpoints were checked **2026-08-28**. Two caveats:

- The Borough's public FeatureServer (`KetchikanAKFeatures`) has tax parcels, not trails.
  Municipal alignments in `data/proposed/municipal-existing.geojson` are approximate until a
  trails layer is published.
- USFS Basic/Surface Ownership returned HTTP 500 for this bbox. Segments with no finer match
  fall back to the Tongass administrative boundary, labelled
  `Tongass National Forest (boundary — parcel unconfirmed)` so the coarser claim is visible.

Proposed lines are conceptual and not surveyed. The site says so on every one of them, and a
test enforces it.

## Forms and analytics

Copy `.env.example` and set Formspree IDs and an optional Plausible domain. Without them, forms fall back to the contact email and analytics stay off.

## Deploy

Railway static: `railway.toml` runs `npm run build` (Nixpacks already installed deps) and
serves `dist`. Do **not** add `--single` — this is a prerendered multi-page site, and that
flag serves the homepage for every route and turns 404s into soft 200s. Cloudflare Pages also
works: publish `dist` after `npm run build`.
