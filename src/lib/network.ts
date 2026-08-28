import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Feature, FeatureCollection, LineString, MultiLineString } from "geojson";
import { CorridorList, NetworkCollection, type Corridor, type Segment } from "./schema";

export type TrailFeature = Feature<LineString | MultiLineString, Segment>;
export type TrailCollection = FeatureCollection<LineString | MultiLineString, Segment>;

let cachedNetwork: TrailCollection | null = null;
let cachedCorridors: Corridor[] | null = null;

function readJson<T>(relPath: string): T {
  const path = resolve(process.cwd(), relPath);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function loadNetwork(): TrailCollection {
  if (cachedNetwork) return cachedNetwork;
  const raw = readJson<unknown>("public/data/network.geojson");
  cachedNetwork = NetworkCollection.parse(raw) as TrailCollection;
  return cachedNetwork;
}

export function loadCorridors(): Corridor[] {
  if (cachedCorridors) return cachedCorridors;
  const raw = readJson<unknown>("public/data/corridors.json");
  cachedCorridors = CorridorList.parse(raw);
  return cachedCorridors;
}

export function loadSupporters(): { count: number; updatedAt: string } {
  return readJson<{ count: number; updatedAt: string }>("data/supporters.json");
}

export function getSegments(): Segment[] {
  return loadNetwork().features.map((feature) => feature.properties);
}

export function getSegmentById(id: string): TrailFeature | undefined {
  return loadNetwork().features.find((feature) => feature.properties.id === id);
}

export function getCorridorById(id: string): Corridor | undefined {
  return loadCorridors().find((corridor) => corridor.id === id);
}

export function getCorridorForSegment(segment: Segment): Corridor | undefined {
  if (!segment.corridorId) return undefined;
  return getCorridorById(segment.corridorId);
}

export function uniqueLandManagers(segments = getSegments()): string[] {
  return [...new Set(segments.flatMap((segment) => segment.landManagers))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/**
 * Real managers only. build-network assigns an "Unmapped" sentinel where no ownership
 * polygon matched; that belongs in the filters, not in a partner list or a headline count.
 */
export function namedLandManagers(segments = getSegments()): string[] {
  return uniqueLandManagers(segments).filter((manager) => !manager.startsWith("Unmapped"));
}

export function networkTotals(segments = getSegments()) {
  const totalMi = segments.reduce((sum, segment) => sum + segment.lengthMi, 0);
  const existingMi = segments
    .filter((segment) => segment.status === "existing" || segment.status === "needs-work")
    .reduce((sum, segment) => sum + segment.lengthMi, 0);
  const gapMi = segments
    .filter((segment) => segment.status === "proposed")
    .reduce((sum, segment) => sum + segment.lengthMi, 0);
  return {
    totalMi,
    existingMi,
    gapMi,
    count: segments.length,
    percentComplete: totalMi === 0 ? 0 : (existingMi / totalMi) * 100,
  };
}
