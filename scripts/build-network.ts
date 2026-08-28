/**
 * Normalize + validate + compute the committed trail network.
 * Reads data/raw/* (optional), data/proposed/*, data/corridors.json, data/overrides.json.
 * Writes public/data/network.geojson, public/data/corridors.json, public/data/network-static.svg.
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import * as turf from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  LineString,
  MultiLineString,
  Polygon,
  MultiPolygon,
  Position,
} from "geojson";
import {
  Corridor,
  CorridorSourceList,
  NetworkCollection,
  Segment,
  SegmentOverride,
  type Segment as SegmentT,
} from "../src/lib/schema.ts";
import { CONCEPTUAL_SOURCE, REVILLA_BBOX, SNAP_METERS } from "../src/lib/constants.ts";
import {
  computeElevationGainFt,
  loadElevationCache,
  saveElevationCache,
} from "./lib/elevation.ts";
import {
  ALL_STATUSES,
  classifyParcelOwner,
  computeCorridorTotals,
  isRoadLike,
  mapDifficulty,
  mapSurface,
  minSeparationMeters,
  roundGeometry,
  slugify,
  titleCase,
} from "./lib/transform.ts";

const RAW = "data/raw";
const PROPOSED_DIR = "data/proposed";
const OUT_DIR = "public/data";
const TODAY = new Date().toISOString().slice(0, 10);

type LineFeat = Feature<LineString | MultiLineString, Record<string, unknown>>;
type PolyFeat = Feature<Polygon | MultiPolygon, { manager: string }>;

const bboxPoly = turf.bboxPolygon([
  REVILLA_BBOX.west,
  REVILLA_BBOX.south,
  REVILLA_BBOX.east,
  REVILLA_BBOX.north,
]);



async function readJsonIfExists<T>(path: string): Promise<T | null> {
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function asCollection(raw: unknown): FeatureCollection {
  if (raw && typeof raw === "object" && (raw as FeatureCollection).type === "FeatureCollection") {
    return raw as FeatureCollection;
  }
  return { type: "FeatureCollection", features: [] };
}

function clipLine(feature: Feature): LineFeat | null {
  if (!feature.geometry) return null;
  const type = feature.geometry.type;
  if (type !== "LineString" && type !== "MultiLineString") return null;
  try {
    const clipped = turf.bboxClip(feature as Feature<LineString | MultiLineString>, [
      REVILLA_BBOX.west,
      REVILLA_BBOX.south,
      REVILLA_BBOX.east,
      REVILLA_BBOX.north,
    ]);
    if (!clipped.geometry) return null;
    // Only drop true degenerates here. Upstream splits one trail into many short pieces,
    // so the publishable-length test has to wait until after they are dissolved by name.
    const length = turf.length(clipped, { units: "miles" });
    if (length < 0.005) return null;
    return clipped as LineFeat;
  } catch {
    return null;
  }
}


function prop(obj: GeoJsonProperties, ...keys: string[]): string {
  if (!obj) return "";
  const lower: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) lower[k.toLowerCase()] = v;
  for (const key of keys) {
    const value = obj[key] ?? lower[key.toLowerCase()];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}




function ownershipFromUsfs(raw: FeatureCollection | null): PolyFeat[] {
  if (!raw) return [];
  const out: PolyFeat[] = [];
  for (const feature of raw.features) {
    if (!feature.geometry) continue;
    const t = feature.geometry.type;
    if (t !== "Polygon" && t !== "MultiPolygon") continue;
    const cls = prop(feature.properties, "OWNERCLASSIFICATION", "ownerclassification");
    const manager =
      cls.toUpperCase().includes("FOREST SERVICE") || cls.toUpperCase() === "USDA FOREST SERVICE"
        ? "USDA Forest Service"
        : null;
    if (!manager) continue;
    out.push(feature as PolyFeat);
    out[out.length - 1].properties = { manager };
  }
  return out;
}

function ownershipFromLayer(raw: FeatureCollection | null, manager: string): PolyFeat[] {
  if (!raw) return [];
  return raw.features
    .filter((f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"))
    .map((f) => {
      const copy = structuredClone(f) as PolyFeat;
      copy.properties = { manager };
      return copy;
    });
}

function ownershipFromParcels(raw: FeatureCollection | null): PolyFeat[] {
  if (!raw) return [];
  const grouped = new Map<string, Feature[]>();
  for (const feature of raw.features) {
    if (!feature.geometry) continue;
    const t = feature.geometry.type;
    if (t !== "Polygon" && t !== "MultiPolygon") continue;
    const manager = classifyParcelOwner(prop(feature.properties, "Owner_Name", "OWNER_NAME"));
    if (!manager || manager === "Private") continue;
    const list = grouped.get(manager) ?? [];
    list.push(feature);
    grouped.set(manager, list);
  }
  const out: PolyFeat[] = [];
  for (const [manager, feats] of grouped) {
    try {
      const fc = turf.featureCollection(feats as Feature<Polygon | MultiPolygon>[]);
      const dissolved = turf.dissolve(fc as FeatureCollection<Polygon, GeoJsonProperties>);
      for (const feature of dissolved.features) {
        (feature.properties as { manager: string }).manager = manager;
        out.push(feature as PolyFeat);
      }
    } catch {
      for (const feature of feats) {
        const copy = structuredClone(feature) as PolyFeat;
        copy.properties = { manager };
        out.push(copy);
      }
    }
  }
  return out;
}

function sampleManagers(line: LineFeat, ownership: PolyFeat[]): string[] {
  if (ownership.length === 0) return [];
  const lengthKm = turf.length(line, { units: "kilometers" });
  const step = 0.2;
  const found = new Set<string>();
  const steps = Math.max(2, Math.ceil(lengthKm / step));
  for (let i = 0; i <= steps; i += 1) {
    const pt = turf.along(turf.lineString(longestLine(line)), (lengthKm * i) / steps, {
      units: "kilometers",
    });
    for (const poly of ownership) {
      try {
        if (turf.booleanPointInPolygon(pt, poly)) {
          found.add(poly.properties.manager);
        }
      } catch {
        /* skip invalid rings */
      }
    }
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

function longestLine(feature: LineFeat): Position[] {
  if (feature.geometry.type === "LineString") return feature.geometry.coordinates;
  let best = feature.geometry.coordinates[0] ?? [];
  for (const coords of feature.geometry.coordinates) {
    if (coords.length > best.length) best = coords;
  }
  return best;
}

function endpoints(feature: LineFeat): [Position, Position] {
  const coords = longestLine(feature);
  return [coords[0], coords[coords.length - 1]];
}







function stableSegment(segment: SegmentT): SegmentT {
  return {
    id: segment.id,
    name: segment.name,
    status: segment.status,
    corridorId: segment.corridorId,
    landManagers: [...segment.landManagers].sort((a, b) => a.localeCompare(b)),
    lengthMi: Number(segment.lengthMi.toFixed(3)),
    elevationGainFt: segment.elevationGainFt,
    difficulty: segment.difficulty,
    surface: segment.surface,
    seasonality: segment.seasonality,
    connectsTo: [...segment.connectsTo].sort(),
    summary: segment.summary,
    whatItNeeds: segment.whatItNeeds,
    sourceRef: segment.sourceRef,
    updatedAt: segment.updatedAt,
  };
}

function fail(message: string): never {
  console.error(`\nbuild-network failed:\n  ${message}\n`);
  process.exit(1);
}

function defaultSummary(name: string, status: SegmentT["status"], sourceRef: string): string {
  if (sourceRef === CONCEPTUAL_SOURCE) {
    return `Conceptual alignment only — not surveyed. ${name} is a gap in the island network.`;
  }
  if (status === "needs-work") {
    return `${name} exists on the ground but needs brushing, drainage, or repair before it can carry the network.`;
  }
  if (status === "under-construction") {
    return `${name} is funded and under construction.`;
  }
  if (status === "proposed") {
    return `${name} is a planned connection. Alignment is not surveyed.`;
  }
  return `${name} is usable today and is part of the existing Revilla trail network.`;
}

function writeStaticSvg(
  features: Feature<LineString | MultiLineString, SegmentT>[],
): string {
  const [minX, minY, maxX, maxY] = [
    REVILLA_BBOX.west,
    REVILLA_BBOX.south,
    REVILLA_BBOX.east,
    REVILLA_BBOX.north,
  ];
  const width = 1200;
  const height = 800;
  const pad = 24;
  const project = ([x, y]: Position): [number, number] => {
    const px = pad + ((x - minX) / (maxX - minX)) * (width - pad * 2);
    const py = pad + ((maxY - y) / (maxY - minY)) * (height - pad * 2);
    return [px, py];
  };
  const color = (status: SegmentT["status"]) => {
    if (status === "proposed") return "#E8467C";
    if (status === "under-construction") return "#B4863C";
    if (status === "needs-work") return "rgba(23,33,31,0.55)";
    return "#17211F";
  };
  const dash = (status: SegmentT["status"]) =>
    status === "proposed" || status === "under-construction" ? "7 6" : "none";

  const paths = features
    .map((feature) => {
      const lines =
        feature.geometry.type === "LineString"
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates;
      return lines
        .map((line) => {
          // Drop vertices closer than a pixel; this is a thumbnail, not the dataset.
          let lastX = Number.NaN;
          let lastY = Number.NaN;
          const simplified = line.filter((coord, index) => {
            const [x, y] = project(coord);
            if (index === 0 || index === line.length - 1) {
              lastX = x;
              lastY = y;
              return true;
            }
            if (Math.abs(x - lastX) < 1.5 && Math.abs(y - lastY) < 1.5) return false;
            lastX = x;
            lastY = y;
            return true;
          });
          if (simplified.length < 2) return "";
          const d = simplified.map((c, i) => {
            const [x, y] = project(c);
            return `${i === 0 ? "M" : "L"}${x.toFixed(0)},${y.toFixed(0)}`;
          }).join(" ");
          return `<path d="${d}" fill="none" stroke="${color(feature.properties.status)}" stroke-width="2.4" stroke-dasharray="${dash(feature.properties.status)}" stroke-linecap="round" stroke-linejoin="round"/>`;
        })
        .join("");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Static map of the Revilla trail network.">
  <rect width="${width}" height="${height}" fill="#E7E4D9"/>
  ${paths}
</svg>
`;
}

async function loadProposed(): Promise<LineFeat[]> {
  if (!existsSync(PROPOSED_DIR)) return [];
  const files = (await readdir(PROPOSED_DIR)).filter((f) => f.endsWith(".geojson"));
  const out: LineFeat[] = [];
  for (const file of files) {
    const raw = asCollection(JSON.parse(await readFile(join(PROPOSED_DIR, file), "utf8")));
    for (const feature of raw.features) {
      const clipped = clipLine(feature);
      if (clipped) {
        clipped.properties = { ...(feature.properties ?? {}), __file: file };
        out.push(clipped);
      }
    }
  }
  return out;
}

function dissolveByName(features: LineFeat[]): LineFeat[] {
  const groups = new Map<string, LineFeat[]>();
  for (const feature of features) {
    const name = prop(feature.properties, "TRAIL_NAME", "trail_name", "name") || "unnamed";
    const list = groups.get(name) ?? [];
    list.push(feature);
    groups.set(name, list);
  }
  const out: LineFeat[] = [];
  for (const [name, group] of groups) {
    const lines: Position[][] = [];
    const props = group[0].properties ?? {};
    for (const feature of group) {
      if (feature.geometry.type === "LineString") lines.push(feature.geometry.coordinates);
      else lines.push(...feature.geometry.coordinates);
    }
    if (lines.length === 0) continue;
    const geometry = lines.length === 1 ? turf.lineString(lines[0]) : turf.multiLineString(lines);
    geometry.properties = { ...props, name };
    out.push(geometry as LineFeat);
  }
  return out;
}

async function main() {
  const allowPartial = process.argv.includes("--allow-partial");
  if (!existsSync(`${RAW}/usfs-trails.geojson`) && !allowPartial) {
    fail(
      [
        "data/raw/usfs-trails.geojson is missing, so this run would rebuild the network from",
        "hand-drawn segments only and overwrite the committed public/data/network.geojson.",
        "",
        "  Run `npm run data` to fetch the public source layers first.",
        "  Pass --allow-partial only if you really mean to publish a partial network.",
      ].join("\n  "),
    );
  }

  const usfsRaw = asCollection(await readJsonIfExists(`${RAW}/usfs-trails.geojson`));
  const usfsOwn = asCollection(await readJsonIfExists(`${RAW}/usfs-ownership.geojson`));
  const dnrMht = asCollection(await readJsonIfExists(`${RAW}/dnr-mht.geojson`));
  const dnrMun = asCollection(await readJsonIfExists(`${RAW}/dnr-municipal.geojson`));
  const dnrState = asCollection(await readJsonIfExists(`${RAW}/dnr-state.geojson`));
  const parcels = asCollection(await readJsonIfExists(`${RAW}/kgb-parcels.geojson`));
  const forestBoundary = asCollection(
    await readJsonIfExists(`${RAW}/usfs-forest-boundary.geojson`),
  );
  const overridesRaw = (await readJsonIfExists<Record<string, unknown>>("data/overrides.json")) ?? {};
  const corridorSource = CorridorSourceList.parse(
    (await readJsonIfExists("data/corridors.json")) ?? [],
  );

  const overrides: Record<string, SegmentOverride> = {};
  for (const [key, value] of Object.entries(overridesRaw)) {
    const parsed = SegmentOverride.safeParse(value);
    if (!parsed.success) {
      fail(`overrides.json / ${key}: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    }
    overrides[key] = parsed.data;
  }

  const ownership: PolyFeat[] = [
    ...ownershipFromUsfs(usfsOwn.features.length ? usfsOwn : null),
    ...ownershipFromLayer(dnrMht.features.length ? dnrMht : null, "Alaska Mental Health Trust"),
    ...ownershipFromLayer(dnrMun.features.length ? dnrMun : null, "Ketchikan Gateway Borough"),
    ...ownershipFromLayer(dnrState.features.length ? dnrState : null, "State of Alaska"),
    ...ownershipFromParcels(parcels.features.length ? parcels : null),
  ];

  // Coarse fallback, applied only where nothing finer matched. "Inside the Tongass" is
  // not the same claim as "the Forest Service owns this parcel", so it is labelled.
  const forestFallback: PolyFeat[] = ownershipFromLayer(
    forestBoundary.features.length ? forestBoundary : null,
    "Tongass National Forest (boundary — parcel unconfirmed)",
  );

  const usfsClipped: LineFeat[] = [];
  for (const feature of usfsRaw.features) {
    const name = prop(feature.properties, "TRAIL_NAME", "trail_name", "name");
    if (!name || isRoadLike(name)) continue;
    const clipped = clipLine(feature);
    if (clipped) {
      clipped.properties = feature.properties ?? {};
      usfsClipped.push(clipped);
    }
  }
  // Now that each named trail is one feature, drop what is only a bbox-edge sliver.
  const MIN_PUBLISH_MI = 0.1;
  const usfsDissolved = dissolveByName(usfsClipped).filter(
    (feature) => turf.length(feature, { units: "miles" }) >= MIN_PUBLISH_MI,
  );

  const proposed = await loadProposed();
  if (usfsDissolved.length === 0 && proposed.length === 0) {
    fail("No trail geometry found. Add data/proposed/*.geojson or run npm run data.");
  }

  const usedIds = new Set<string>();
  const built: Feature<LineString | MultiLineString, SegmentT>[] = [];

  function takeId(preferred: string): string {
    let id = preferred;
    let n = 2;
    while (usedIds.has(id)) {
      id = `${preferred}-${n}`;
      n += 1;
    }
    usedIds.add(id);
    return id;
  }

  function ingest(
    feature: LineFeat,
    defaults: {
      sourceName: string;
      sourceRef: string;
      fallbackStatus: SegmentT["status"];
    },
  ) {
    const sourceName = defaults.sourceName;
    const sourceSlug = slugify(sourceName);
    if (!sourceSlug && !prop(feature.properties, "id")) return;
    const override = overrides[sourceSlug] ?? overrides[slugify(prop(feature.properties, "id"))] ?? {};
    if (override.include === false) return;

    const rawStatus = prop(feature.properties, "status");
    const statusFromProps =
      rawStatus === "existing" ||
      rawStatus === "needs-work" ||
      rawStatus === "under-construction" ||
      rawStatus === "proposed"
        ? rawStatus
        : null;
    const id = takeId(override.id ?? (prop(feature.properties, "id") || sourceSlug));
    const status = override.status ?? statusFromProps ?? defaults.fallbackStatus;
    const name = override.name ?? prop(feature.properties, "name") ?? titleCase(sourceName);
    const sourceRef = prop(feature.properties, "sourceRef") || defaults.sourceRef;
    const lengthMi = turf.length(feature, { units: "miles" });
    const managers =
      override.landManagers ??
      (Array.isArray(feature.properties?.landManagers)
        ? (feature.properties.landManagers as string[])
        : (() => {
            const matched = sampleManagers(feature, ownership);
            return matched.length ? matched : sampleManagers(feature, forestFallback);
          })());

    const surface =
      override.surface ??
      (prop(feature.properties, "surface") as SegmentT["surface"]) ??
      mapSurface(prop(feature.properties, "TRAIL_SURFACE", "trail_surface"));

    const difficulty =
      override.difficulty !== undefined
        ? override.difficulty
        : mapDifficulty(prop(feature.properties, "TRAIL_CLASS", "trail_class"));

    const summary =
      override.summary ??
      prop(feature.properties, "summary") ??
      defaultSummary(name, status, sourceRef);

    // Every line that does not exist on the ground must say so in its own words. This is
    // the promise the site makes to the land managers reading it.
    if (status === "proposed" && !/not surveyed|conceptual/i.test(summary)) {
      fail(`${id}: proposed segments must state that the alignment is not surveyed.`);
    }
    if (sourceRef === CONCEPTUAL_SOURCE && !/not surveyed|conceptual/i.test(summary)) {
      fail(`${id}: conceptual segments must say the alignment is not surveyed.`);
    }

    const whatItNeeds =
      override.whatItNeeds !== undefined
        ? override.whatItNeeds
        : status === "existing"
          ? null
          : (prop(feature.properties, "whatItNeeds") ||
              (status === "proposed"
                ? "Surveyed alignment, land-manager agreement, and a funded construction package."
                : "Brushing, drainage, and a current condition assessment."));

    const corridorId =
      override.corridorId !== undefined
        ? override.corridorId
        : prop(feature.properties, "corridorId") || null;

    const segment: SegmentT = stableSegment({
      id,
      name,
      status,
      corridorId: corridorId || null,
      landManagers: managers.length ? managers : ["Unmapped — confirm with land manager"],
      lengthMi,
      elevationGainFt: override.elevationGainFt ?? null,
      difficulty: difficulty ?? null,
      surface: surface || (status === "proposed" ? "unbuilt" : "native"),
      seasonality: override.seasonality ?? (prop(feature.properties, "seasonality") || "Snow-free May–October"),
      connectsTo: [],
      summary: summary.slice(0, 400),
      whatItNeeds,
      sourceRef,
      updatedAt: prop(feature.properties, "updatedAt") || TODAY,
    });

    const parsed = Segment.safeParse(segment);
    if (!parsed.success) {
      fail(`${id}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
    }

    built.push({
      type: "Feature",
      id,
      geometry: feature.geometry,
      properties: parsed.data,
    });
  }

  for (const feature of usfsDissolved) {
    const sourceName = prop(feature.properties, "name", "TRAIL_NAME", "trail_name");
    ingest(feature, {
      sourceName,
      sourceRef: "usfs-nfs-trails",
      fallbackStatus: "existing",
    });
  }

  for (const feature of proposed) {
    const sourceName = prop(feature.properties, "name", "id") || "hand-drawn";
    const status = (prop(feature.properties, "status") as SegmentT["status"]) || "proposed";
    ingest(feature, {
      sourceName,
      sourceRef: prop(feature.properties, "sourceRef") || CONCEPTUAL_SOURCE,
      fallbackStatus: status,
    });
  }

  // Measured elevation gain from USGS 3DEP, unless an override already states one.
  // --no-elevation stays offline but still reuses the cache, so an offline rebuild
  // never silently drops values that were already measured.
  const cacheOnly = process.argv.includes("--no-elevation");
  await loadElevationCache();
  let filled = 0;
  for (const feature of built) {
    if (feature.properties.elevationGainFt != null) continue;
    const gain = await computeElevationGainFt(feature, { cacheOnly });
    if (gain != null) {
      feature.properties.elevationGainFt = gain;
      filled += 1;
    }
  }
  await saveElevationCache();
  console.log(
    `  elevation: filled ${filled} segment(s) from USGS 3DEP${cacheOnly ? " (cache only)" : ""}`,
  );

  // A junction is one trail's endpoint meeting anywhere along another trail, not just at
  // its endpoints — trails routinely tee into the middle of another. Endpoint-to-endpoint
  // matching found almost nothing.
  const links = new Map<string, Set<string>>();
  for (const feature of built) links.set(feature.properties.id, new Set<string>());

  const joins: Array<{ a: string; b: string; meters: number }> = [];
  for (let i = 0; i < built.length; i += 1) {
    for (let j = i + 1; j < built.length; j += 1) {
      const meters = minSeparationMeters(built[i], built[j]);
      if (meters <= SNAP_METERS) {
        links.get(built[i].properties.id)!.add(built[j].properties.id);
        links.get(built[j].properties.id)!.add(built[i].properties.id);
        joins.push({
          a: built[i].properties.id,
          b: built[j].properties.id,
          meters: Math.round(meters),
        });
      }
    }
  }
  for (const feature of built) {
    feature.properties.connectsTo = [...links.get(feature.properties.id)!].sort();
  }

  built.sort((a, b) => a.properties.id.localeCompare(b.properties.id));

  const byId = new Map(built.map((f) => [f.properties.id, f]));
  const corridors = corridorSource.map((source) => {
    const missing = source.segmentIds.filter((id) => !byId.has(id));
    if (missing.length) {
      fail(`corridor ${source.id} references unknown segment(s): ${missing.join(", ")}`);
    }
    const members = source.segmentIds.map((id) => {
      const segment = byId.get(id)!.properties;
      if (!segment.corridorId) segment.corridorId = source.id;
      return segment;
    });
    const corridor = {
      id: source.id,
      name: source.name,
      segmentIds: source.segmentIds,
      blurb: source.blurb,
      ...computeCorridorTotals(members),
    };
    const parsed = Corridor.safeParse(corridor);
    if (!parsed.success) {
      fail(`corridor ${source.id}: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    }
    return parsed.data;
  });

  // A segment pointing at a corridor that does not exist would render a dead link.
  const corridorIds = new Set(corridors.map((corridor) => corridor.id));
  for (const feature of built) {
    const claimed = feature.properties.corridorId;
    if (claimed && !corridorIds.has(claimed)) {
      fail(
        `${feature.properties.id}: corridorId "${claimed}" is not a corridor in data/corridors.json.`,
      );
    }
  }

  const collection = {
    type: "FeatureCollection" as const,
    features: built.map((feature) => ({
      type: "Feature" as const,
      id: feature.properties.id,
      geometry: roundGeometry(feature.geometry),
      properties: stableSegment(feature.properties),
    })),
  };

  const net = NetworkCollection.safeParse(collection);
  if (!net.success) {
    fail(`network.geojson: ${net.error.issues.map((i) => i.message).join("; ")}`);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(`${OUT_DIR}/network.geojson`, `${JSON.stringify(net.data, null, 2)}\n`, "utf8");
  await writeFile(`${OUT_DIR}/corridors.json`, `${JSON.stringify(corridors, null, 2)}\n`, "utf8");
  await writeFile(`${OUT_DIR}/network-static.svg`, writeStaticSvg(built), "utf8");

  const inside = turf.pointsWithinPolygon
    ? null
    : null;
  void inside;
  void bboxPoly;

  console.log(
    `Wrote ${built.length} segments and ${corridors.length} corridors → ${OUT_DIR}/ (${ownership.length} ownership polygons used).`,
  );

  // Editorial gaps are not build failures, but they should never be silent.
  const report: string[] = [];
  const statusCounts = new Map<SegmentT["status"], number>();
  for (const feature of built) {
    statusCounts.set(
      feature.properties.status,
      (statusCounts.get(feature.properties.status) ?? 0) + 1,
    );
  }
  for (const status of ALL_STATUSES) {
    if (!statusCounts.get(status)) report.push(`no segment uses status "${status}"`);
  }

  const unmapped = built.filter((f) =>
    f.properties.landManagers.some((m) => m.startsWith("Unmapped")),
  );
  if (unmapped.length) {
    report.push(
      `${unmapped.length} segment(s) have no ownership match: ${unmapped.map((f) => f.properties.id).join(", ")}`,
    );
  }

  const orphans = built.filter((f) => !f.properties.corridorId);
  if (orphans.length) {
    report.push(`${orphans.length} of ${built.length} segment(s) belong to no corridor`);
  }

  const isolated = built.filter((f) => f.properties.connectsTo.length === 0);
  if (isolated.length) {
    report.push(
      `${isolated.length} segment(s) connect to nothing within ${SNAP_METERS} m: ${isolated
        .map((f) => f.properties.id)
        .join(", ")}`,
    );
  }

  const noElevation = built.filter((f) => f.properties.elevationGainFt == null);
  if (noElevation.length) {
    report.push(`${noElevation.length} segment(s) still have no elevation gain`);
  }

  console.log(`  junctions found: ${joins.length}`);
  if (report.length) {
    console.log("\nReview:");
    for (const line of report) console.log(`  · ${line}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
