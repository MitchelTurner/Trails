import { describe, expect, it } from "vitest";
import { Corridor, NetworkCollection, Segment, SegmentOverride } from "../src/lib/schema.ts";

const valid = {
  id: "ward-creek",
  name: "Ward Creek",
  status: "existing" as const,
  corridorId: "ward-to-lunch-creek",
  landManagers: ["USDA Forest Service"],
  lengthMi: 2.3,
  elevationGainFt: 240,
  difficulty: "easy" as const,
  surface: "gravel" as const,
  seasonality: "Snow-free May–October",
  connectsTo: ["ward-lake-nature-trail"],
  summary: "Existing trail along Ward Creek.",
  whatItNeeds: null,
  sourceRef: "usfs-nfs-trails",
  updatedAt: "2026-08-28",
};

describe("Segment schema", () => {
  it("accepts a well-formed segment", () => {
    expect(Segment.parse(valid)).toMatchObject({ id: "ward-creek" });
  });

  it("rejects an unknown status so bad data fails the build", () => {
    expect(Segment.safeParse({ ...valid, status: "maybe" }).success).toBe(false);
  });

  it("requires at least one land manager", () => {
    expect(Segment.safeParse({ ...valid, landManagers: [] }).success).toBe(false);
  });

  it("caps summary length", () => {
    expect(Segment.safeParse({ ...valid, summary: "x".repeat(401) }).success).toBe(false);
  });

  it("allows null for genuinely unknown fields rather than zero", () => {
    const parsed = Segment.parse({ ...valid, elevationGainFt: null, difficulty: null });
    expect(parsed.elevationGainFt).toBeNull();
    expect(parsed.difficulty).toBeNull();
  });

  it("rejects a missing corridorId key entirely", () => {
    const { corridorId, ...withoutCorridor } = valid;
    void corridorId;
    expect(Segment.safeParse(withoutCorridor).success).toBe(false);
  });
});

describe("Corridor schema", () => {
  it("accepts computed totals", () => {
    expect(
      Corridor.parse({
        id: "a",
        name: "A",
        segmentIds: ["ward-creek"],
        blurb: "b",
        totalMi: 1,
        existingMi: 1,
        gapMi: 0,
        percentComplete: 100,
      }).percentComplete,
    ).toBe(100);
  });

  it("rejects a corridor missing its computed mileage", () => {
    expect(
      Corridor.safeParse({ id: "a", name: "A", segmentIds: [], blurb: "b" }).success,
    ).toBe(false);
  });
});

describe("SegmentOverride schema", () => {
  it("rejects unknown keys so typos in overrides.json fail loudly", () => {
    expect(SegmentOverride.safeParse({ statuss: "existing" }).success).toBe(false);
  });

  it("allows a partial override", () => {
    expect(SegmentOverride.safeParse({ status: "needs-work" }).success).toBe(true);
  });

  it("allows excluding a segment", () => {
    expect(SegmentOverride.safeParse({ include: false }).success).toBe(true);
  });
});

describe("NetworkCollection schema", () => {
  it("rejects a polygon masquerading as a trail", () => {
    const bad = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 1], [0, 1], [0, 0]]] },
          properties: valid,
        },
      ],
    };
    expect(NetworkCollection.safeParse(bad).success).toBe(false);
  });

  it("accepts a LineString feature", () => {
    const good = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: [
              [-131.6, 55.3],
              [-131.6, 55.31],
            ],
          },
          properties: valid,
        },
      ],
    };
    expect(NetworkCollection.safeParse(good).success).toBe(true);
  });
});
