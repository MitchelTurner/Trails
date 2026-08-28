/**
 * Pure transforms used by build-network. Kept separate so they can be unit tested
 * without network access or file IO.
 */
import * as turf from "@turf/turf";
import type { Feature, LineString, MultiLineString, Position } from "geojson";
import type { Segment, SegmentStatus } from "../../src/lib/schema.ts";

/** 6 decimals is ~11 cm at this latitude. Upstream 17-decimal floats tripled the payload. */
export const COORD_PRECISION = 6;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bUsfs\b/g, "USFS")
    .replace(/\bNfs\b/g, "NFS");
}

/** Roads and numbered spurs are not trails; the USFS layer mixes them in. */
export function isRoadLike(name: string): boolean {
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

export function mapSurface(raw: string): Segment["surface"] {
  const n = raw.toLowerCase();
  if (n.includes("board")) return "boardwalk";
  if (n.includes("gravel") || n.includes("crushed") || n.includes("imported")) return "gravel";
  if (n.includes("rock") || n.includes("bedrock")) return "rock";
  if (n.includes("unbuilt") || n.includes("proposed")) return "unbuilt";
  return "native";
}

export function mapDifficulty(trailClass: string): Segment["difficulty"] {
  if (trailClass === "1" || trailClass === "2") return "easy";
  if (trailClass === "3") return "moderate";
  if (trailClass === "4" || trailClass === "5") return "difficult";
  return null;
}

/** Group raw parcel owner strings into the managers the site actually talks about. */
export function classifyParcelOwner(name: string): string | null {
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

export function roundPosition(position: Position): Position {
  const factor = 10 ** COORD_PRECISION;
  return [
    Math.round(position[0] * factor) / factor,
    Math.round(position[1] * factor) / factor,
  ];
}

export function dedupe(coords: Position[]): Position[] {
  const out: Position[] = [];
  for (const coord of coords) {
    const last = out[out.length - 1];
    if (!last || last[0] !== coord[0] || last[1] !== coord[1]) out.push(coord);
  }
  return out;
}

export function roundGeometry(
  geometry: LineString | MultiLineString,
): LineString | MultiLineString {
  if (geometry.type === "LineString") {
    return { type: "LineString", coordinates: dedupe(geometry.coordinates.map(roundPosition)) };
  }
  return {
    type: "MultiLineString",
    coordinates: geometry.coordinates
      .map((line) => dedupe(line.map(roundPosition)))
      .filter((line) => line.length >= 2),
  };
}

export function allLines(feature: Feature<LineString | MultiLineString, unknown>): Position[][] {
  return feature.geometry.type === "LineString"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
}

/**
 * Smallest distance between two trails: every endpoint of each against the whole of the
 * other, plus any true crossing. Catches tee junctions, not just end-to-end meetings.
 */
export function minSeparationMeters(
  a: Feature<LineString | MultiLineString, unknown>,
  b: Feature<LineString | MultiLineString, unknown>,
): number {
  const aLines = allLines(a);
  const bLines = allLines(b);

  for (const aCoords of aLines) {
    for (const bCoords of bLines) {
      if (aCoords.length < 2 || bCoords.length < 2) continue;
      try {
        const crossing = turf.lineIntersect(turf.lineString(aCoords), turf.lineString(bCoords));
        if (crossing.features.length > 0) return 0;
      } catch {
        /* ignore degenerate geometry */
      }
    }
  }

  let best = Infinity;
  const probe = (coords: Position[], others: Position[][]) => {
    for (const end of [coords[0], coords[coords.length - 1]]) {
      for (const other of others) {
        if (other.length < 2) continue;
        try {
          const distance = turf.pointToLineDistance(turf.point(end), turf.lineString(other), {
            units: "meters",
          });
          if (distance < best) best = distance;
        } catch {
          /* ignore degenerate geometry */
        }
      }
    }
  };

  for (const aCoords of aLines) probe(aCoords, bLines);
  for (const bCoords of bLines) probe(bCoords, aLines);
  return best;
}

export interface CorridorTotals {
  totalMi: number;
  existingMi: number;
  gapMi: number;
  percentComplete: number;
}

/** needs-work counts as built ground; only "proposed" is a gap. */
export function computeCorridorTotals(
  segments: Array<Pick<Segment, "status" | "lengthMi">>,
): CorridorTotals {
  let totalMi = 0;
  let existingMi = 0;
  let gapMi = 0;
  for (const segment of segments) {
    totalMi += segment.lengthMi;
    if (segment.status === "existing" || segment.status === "needs-work") {
      existingMi += segment.lengthMi;
    }
    if (segment.status === "proposed") gapMi += segment.lengthMi;
  }
  return {
    totalMi: Number(totalMi.toFixed(3)),
    existingMi: Number(existingMi.toFixed(3)),
    gapMi: Number(gapMi.toFixed(3)),
    percentComplete: totalMi === 0 ? 0 : Number(((existingMi / totalMi) * 100).toFixed(1)),
  };
}

export const ALL_STATUSES: SegmentStatus[] = [
  "existing",
  "needs-work",
  "under-construction",
  "proposed",
];
