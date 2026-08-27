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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUsfs\b/g, "USFS")
    .replace(/\bNfs\b/g, "NFS");
}

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
    const length = turf.length(clipped, { units: "miles" });
    if (length < 0.02) return null;
    return clipped as LineFeat;
  } catch {
    return null;
  }
}

function isRoadLike(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("road") ||
    /\brd\b/.test(n) ||
    n.includes("ltf") ||
    /^\d/.test(n.trim()) ||
    /\d{5,}/.test(n) ||
    n.includes("system shoal") ||
    n.includes("betton") ||
    n.includes("entrance")
  );
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

function mapSurface(raw: string): SegmentT["surface"] {
  const n = raw.toLowerCase();
  if (n.includes("board")) return "boardwalk";
  if (n.includes("gravel") || n.includes("crushed") || n.includes("imported")) return "gravel";
  if (n.includes("rock") || n.includes("bedrock")) return "rock";
  if (n.includes("unbuilt") || n.includes("proposed")) return "unbuilt";
  return "native";
}

function mapDifficulty(trailClass: string): SegmentT["difficulty"] {
  if (trailClass === "1" || trailClass === "2") return "easy";
  if (trailClass === "3") return "moderate";
  if (trailClass === "4" || trailClass === "5") return "difficult";
  return null;
}

function classifyParcelOwner(name: string): string | null {
  const n = name.toUpperCase();
  if (!n) return null;
  if (/(FOREST SERVICE|USDA|UNITED STATES OF AMERICA|U\.S\.A\.|USA\b|USFS)/.test(n)) {
    return "USDA Forest Service";
  }
  if (/(MENTAL HEALTH|AMHT|AHFC MENTAL)/.test(n)) return "Alaska Mental Health Trust";
  if (/(STATE OF ALASKA|ALASKA DNR|AK DNR|STATE OF AK)/.test(n)) return "State of Alaska";
  if (/(KETCHIKAN GATEWAY BOROUGH|\bKGB\b)/.test(n)) return "Ketchikan Gateway Borough";
  if (/CITY OF KETCHIKAN/.test(n)) return "City of Ketchikan";
  if (/CITY OF SAXMAN/.test(n)) return "City of Saxman";
  if (/(CAPE FOX|KETCHIKAN INDIAN|KIC\b|NATIVE CORP|IRA COUNCIL)/.test(n)) {
    return "Native corporation / tribal";
  }
  return "Private";
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
          const d = line.map((c, i) => {
            const [x, y] = project(c);
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
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
  const usfsRaw = asCollection(await readJsonIfExists(`${RAW}/usfs-trails.geojson`));
  const usfsOwn = asCollection(await readJsonIfExists(`${RAW}/usfs-ownership.geojson`));
  const dnrMht = asCollection(await readJsonIfExists(`${RAW}/dnr-mht.geojson`));
  const dnrMun = asCollection(await readJsonIfExists(`${RAW}/dnr-municipal.geojson`));
  const dnrState = asCollection(await readJsonIfExists(`${RAW}/dnr-state.geojson`));
  const parcels = asCollection(await readJsonIfExists(`${RAW}/kgb-parcels.geojson`));
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
  const usfsDissolved = dissolveByName(usfsClipped);

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
        : sampleManagers(feature, ownership));

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

    if (sourceRef === CONCEPTUAL_SOURCE && !/not surveyed|conceptual/i.test(summary)) {
      fail(`${id}: proposed conceptual segments must say the alignment is not surveyed.`);
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

  // connectsTo by endpoint proximity
  for (let i = 0; i < built.length; i += 1) {
    const [a0, a1] = endpoints(built[i]);
    const links = new Set<string>();
    for (let j = 0; j < built.length; j += 1) {
      if (i === j) continue;
      const [b0, b1] = endpoints(built[j]);
      const d = Math.min(
        turf.distance(a0, b0, { units: "meters" }),
        turf.distance(a0, b1, { units: "meters" }),
        turf.distance(a1, b0, { units: "meters" }),
        turf.distance(a1, b1, { units: "meters" }),
      );
      if (d <= SNAP_METERS) links.add(built[j].properties.id);
    }
    built[i].properties.connectsTo = [...links].sort();
  }

  built.sort((a, b) => a.properties.id.localeCompare(b.properties.id));

  const byId = new Map(built.map((f) => [f.properties.id, f]));
  const corridors = corridorSource.map((source) => {
    const missing = source.segmentIds.filter((id) => !byId.has(id));
    if (missing.length) {
      fail(`corridor ${source.id} references unknown segment(s): ${missing.join(", ")}`);
    }
    let totalMi = 0;
    let existingMi = 0;
    let gapMi = 0;
    for (const id of source.segmentIds) {
      const segment = byId.get(id)!.properties;
      totalMi += segment.lengthMi;
      if (segment.status === "existing" || segment.status === "needs-work") existingMi += segment.lengthMi;
      if (segment.status === "proposed") gapMi += segment.lengthMi;
      if (!segment.corridorId) segment.corridorId = source.id;
    }
    const corridor = {
      id: source.id,
      name: source.name,
      segmentIds: source.segmentIds,
      blurb: source.blurb,
      totalMi: Number(totalMi.toFixed(3)),
      existingMi: Number(existingMi.toFixed(3)),
      gapMi: Number(gapMi.toFixed(3)),
      percentComplete: totalMi === 0 ? 0 : Number(((existingMi / totalMi) * 100).toFixed(1)),
    };
    const parsed = Corridor.safeParse(corridor);
    if (!parsed.success) {
      fail(`corridor ${source.id}: ${parsed.error.issues.map((i) => i.message).join("; ")}`);
    }
    return parsed.data;
  });

  const collection = {
    type: "FeatureCollection" as const,
    features: built.map((feature) => ({
      type: "Feature" as const,
      id: feature.properties.id,
      geometry: feature.geometry,
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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
