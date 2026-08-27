# Revilla Trails

Working name for the Ketchikan Trail Association — a static, prerendered marketing and advocacy site whose homepage is an interactive map of every existing and proposed trail segment on Revillagigedo Island.

Phase 1 has **no donate button**. The group is informal: no entity, no bank account, no 501(c)(3). What replaces it is a public supporter count.

## Stack

- Astro (React islands) + Tailwind v4
- MapLibre GL JS 5, USGS National Map tiles (`USGSTopo` / `USGSImageryTopo`)
- Committed GeoJSON, built by scripts — nothing fetches at runtime

## Commands

```bash
npm install
npm run data          # fetch public GIS layers, then build the network
npm run data:build    # rebuild from data/raw + data/proposed (offline)
npm run dev
npm run build
```

Swap the public name in `src/config/site.ts`. It is used everywhere.

## Data

| Path | Role |
|---|---|
| `scripts/fetch-sources.ts` | Pull USFS NFS trails, USFS ownership, Alaska DNR ownership, KGB tax parcels |
| `scripts/build-network.ts` | Clip, dissolve, intersect land managers, validate with zod |
| `data/proposed/` | Hand-drawn connectors and approximate municipal trails |
| `data/corridors.json` | Named priority routes |
| `data/overrides.json` | Status, copy, and include/exclude for USFS names |
| `public/data/network.geojson` | Build output, committed |

Source endpoints were checked **2026-08-27**. The Borough's public FeatureServer (`KetchikanAKFeatures`) has tax parcels, not trails. Municipal alignments in `data/proposed/municipal-existing.geojson` are approximate until a trails layer is published.

Proposed lines are conceptual and not surveyed. The site says so on every one of them.

## Forms and analytics

Copy `.env.example` and set Formspree IDs and an optional Plausible domain. Without them, forms fall back to the contact email and analytics stay off.

## Deploy

Railway static: `railway.toml` builds the site and serves `dist` with `serve`. Cloudflare Pages also works — publish the `dist` directory after `npm run build`.
