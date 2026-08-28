import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import * as turf from "@turf/turf";
import type { Feature, LineString, MultiLineString, Position } from "geojson";

/**
 * USGS 3DEP point elevation. Public, no key. Checked 2026-08-28.
 * https://epqs.nationalmap.gov/v1/json?x=<lon>&y=<lat>&units=Feet&wkid=4326
 *
 * The cache is committed (unlike data/raw) because it is small, expensive to rebuild —
 * a few thousand HTTP calls — and it makes offline rebuilds deterministic.
 */
const EPQS = "https://epqs.nationalmap.gov/v1/json";
const CACHE_PATH = "data/elevation-cache.json";
const SAMPLE_SPACING_MI = 0.15;
const MAX_SAMPLES_PER_SEGMENT = 60;

type Cache = Record<string, number | null>;

let cache: Cache | null = null;
let dirty = false;

function key(position: Position): string {
  return `${position[0].toFixed(5)},${position[1].toFixed(5)}`;
}

export async function loadElevationCache(): Promise<void> {
  if (cache) return;
  cache = existsSync(CACHE_PATH) ? JSON.parse(await readFile(CACHE_PATH, "utf8")) : {};
}

export async function saveElevationCache(): Promise<void> {
  if (!cache || !dirty) return;
  await mkdir(dirname(CACHE_PATH), { recursive: true });
  await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 0)}\n`, "utf8");
  dirty = false;
}

async function elevationFeet(position: Position, cacheOnly: boolean): Promise<number | null> {
  await loadElevationCache();
  const cacheKey = key(position);
  if (cacheKey in cache!) return cache![cacheKey];
  if (cacheOnly) return null;

  const url = `${EPQS}?x=${position[0]}&y=${position[1]}&units=Feet&wkid=4326`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = (await response.json()) as { value?: number | string };
    const value = typeof body.value === "string" ? Number(body.value) : body.value;
    const feet = typeof value === "number" && Number.isFinite(value) && value > -1000 ? value : null;
    cache![cacheKey] = feet;
    dirty = true;
    return feet;
  } catch {
    cache![cacheKey] = null;
    dirty = true;
    return null;
  }
}

function longest(feature: Feature<LineString | MultiLineString, unknown>): Position[] {
  if (feature.geometry.type === "LineString") return feature.geometry.coordinates;
  return feature.geometry.coordinates.reduce(
    (best, line) => (line.length > best.length ? line : best),
    [] as Position[],
  );
}

/**
 * Cumulative gain along the segment, sampled at a fixed spacing. Returns null when
 * 3DEP could not be reached for enough points to be meaningful — never a guess.
 */
export async function computeElevationGainFt(
  feature: Feature<LineString | MultiLineString, unknown>,
  { cacheOnly = false }: { cacheOnly?: boolean } = {},
): Promise<number | null> {
  const coords = longest(feature);
  if (coords.length < 2) return null;

  const line = turf.lineString(coords);
  const lengthMi = turf.length(line, { units: "miles" });
  const steps = Math.min(
    MAX_SAMPLES_PER_SEGMENT,
    Math.max(2, Math.ceil(lengthMi / SAMPLE_SPACING_MI)),
  );

  const samples: Array<number | null> = [];
  for (let i = 0; i <= steps; i += 1) {
    const point = turf.along(line, (lengthMi * i) / steps, { units: "miles" });
    samples.push(await elevationFeet(point.geometry.coordinates, cacheOnly));
  }

  const measured = samples.filter((value): value is number => value != null);
  if (measured.length < Math.max(3, Math.ceil(samples.length * 0.6))) return null;

  let gain = 0;
  for (let i = 1; i < measured.length; i += 1) {
    const delta = measured[i] - measured[i - 1];
    // Ignore sub-10 ft wobble so DEM noise does not inflate the total.
    if (delta > 10) gain += delta;
  }
  return Math.round(gain / 10) * 10;
}
