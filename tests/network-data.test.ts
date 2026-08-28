/**
 * Contract tests over the committed dataset. These guard the promises the site makes in
 * public: every proposed line says it is unsurveyed, corridors reference real segments,
 * and nothing ships without a land manager.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CONCEPTUAL_SOURCE, REVILLA_BBOX } from "../src/lib/constants.ts";
import { CorridorList, NetworkCollection } from "../src/lib/schema.ts";

const read = (relative: string) =>
  JSON.parse(readFileSync(resolve(import.meta.dirname, "..", relative), "utf8"));

const parsed = NetworkCollection.parse(read("public/data/network.geojson"));
const segments = parsed.features.map((feature) => feature.properties);
const parsedCorridors = CorridorList.parse(read("public/data/corridors.json"));
const supporters = read("data/supporters.json") as { count: number | null };

describe("committed network.geojson", () => {
  it("validates against the schema", () => {
    expect(segments.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    expect(new Set(segments.map((s) => s.id)).size).toBe(segments.length);
  });

  it("gives every segment at least one land manager and no unresolved sentinel", () => {
    for (const segment of segments) {
      expect(segment.landManagers.length).toBeGreaterThan(0);
      expect(segment.landManagers.some((m) => m.startsWith("Unmapped"))).toBe(false);
    }
  });

  it("says every conceptual alignment is not surveyed", () => {
    const conceptual = segments.filter((s) => s.sourceRef === CONCEPTUAL_SOURCE);
    expect(conceptual.length).toBeGreaterThan(0);
    for (const segment of conceptual) {
      expect(segment.summary).toMatch(/not surveyed|conceptual/i);
    }
  });

  it("gives every non-existing segment something it needs", () => {
    for (const segment of segments.filter((s) => s.status !== "existing")) {
      expect(segment.whatItNeeds, segment.id).toBeTruthy();
    }
  });

  it("keeps all geometry inside the Revilla bbox", () => {
    for (const feature of parsed.features) {
      const lines =
        feature.geometry.type === "LineString"
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates;
      for (const line of lines as number[][][]) {
        for (const [lon, lat] of line) {
          expect(lon).toBeGreaterThanOrEqual(REVILLA_BBOX.west);
          expect(lon).toBeLessThanOrEqual(REVILLA_BBOX.east);
          expect(lat).toBeGreaterThanOrEqual(REVILLA_BBOX.south);
          expect(lat).toBeLessThanOrEqual(REVILLA_BBOX.north);
        }
      }
    }
  });

  it("keeps coordinates trimmed to 6 decimals", () => {
    for (const feature of parsed.features) {
      const lines =
        feature.geometry.type === "LineString"
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates;
      for (const line of lines as number[][][]) {
        for (const position of line) {
          for (const value of position) {
            const decimals = (String(value).split(".")[1] ?? "").length;
            expect(decimals).toBeLessThanOrEqual(6);
          }
        }
      }
    }
  });

  it("only references connectsTo ids that exist, symmetrically", () => {
    const byId = new Map(segments.map((s) => [s.id, s]));
    for (const segment of segments) {
      for (const other of segment.connectsTo) {
        const target = byId.get(other);
        expect(target, `${segment.id} -> ${other}`).toBeDefined();
        expect(target!.connectsTo).toContain(segment.id);
      }
    }
  });

  it("has positive lengths", () => {
    for (const segment of segments) expect(segment.lengthMi).toBeGreaterThan(0);
  });
});

describe("committed corridors.json", () => {
  it("references only real segments", () => {
    const ids = new Set(segments.map((s) => s.id));
    for (const corridor of parsedCorridors) {
      for (const id of corridor.segmentIds) {
        expect(ids.has(id), `${corridor.id} -> ${id}`).toBe(true);
      }
    }
  });

  it("has mileage that adds up to its member segments", () => {
    const byId = new Map(segments.map((s) => [s.id, s]));
    for (const corridor of parsedCorridors) {
      const total = corridor.segmentIds.reduce((sum, id) => sum + byId.get(id)!.lengthMi, 0);
      expect(corridor.totalMi).toBeCloseTo(total, 1);
      expect(corridor.existingMi + corridor.gapMi).toBeLessThanOrEqual(corridor.totalMi + 0.01);
    }
  });
});

describe("supporters.json", () => {
  it("is null or a real non-negative number, never a placeholder", () => {
    const { count } = supporters;
    if (count !== null) {
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});
