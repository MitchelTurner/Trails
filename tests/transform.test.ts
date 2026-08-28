import { describe, expect, it } from "vitest";
import * as turf from "@turf/turf";
import {
  classifyParcelOwner,
  computeCorridorTotals,
  dedupe,
  isRoadLike,
  mapDifficulty,
  mapSurface,
  minSeparationMeters,
  roundGeometry,
  roundPosition,
  slugify,
  titleCase,
} from "../scripts/lib/transform.ts";

describe("slugify", () => {
  it("makes stable kebab ids", () => {
    expect(slugify("Ward Lake Nature Trail")).toBe("ward-lake-nature-trail");
    expect(slugify("DEER MT - SUMMIT SPUR")).toBe("deer-mt-summit-spur");
    expect(slugify("Married Man's Trail")).toBe("married-mans-trail");
  });

  it("does not emit leading or trailing dashes", () => {
    expect(slugify("  -- Ward -- ")).toBe("ward");
  });
});

describe("titleCase", () => {
  it("keeps agency acronyms upper", () => {
    expect(titleCase("USFS TRAIL")).toBe("USFS Trail");
    expect(titleCase("WARD CREEK")).toBe("Ward Creek");
  });
});

describe("isRoadLike", () => {
  it("rejects roads and numbered spurs from the USFS layer", () => {
    expect(isRoadLike("8000000 MARGARET ROAD SYSTEM")).toBe(true);
    expect(isRoadLike("ELF POINT LTF ROAD")).toBe(true);
    expect(isRoadLike("TRAITORS COVE ENTRANCE  804030")).toBe(true);
    expect(isRoadLike("8060550 ROAD")).toBe(true);
  });

  it("keeps real trails", () => {
    expect(isRoadLike("DEER MOUNTAIN NATIONAL RECREAT")).toBe(false);
    expect(isRoadLike("WARD LAKE NATURE TRAIL")).toBe(false);
    expect(isRoadLike("PERSEVERANCE TRAIL")).toBe(false);
  });
});

describe("mapSurface", () => {
  it("maps upstream surface strings", () => {
    expect(mapSurface("NATIVE MATERIAL")).toBe("native");
    expect(mapSurface("IMPORTED COMPACTED MATERIAL")).toBe("gravel");
    expect(mapSurface("Boardwalk decking")).toBe("boardwalk");
    expect(mapSurface("BEDROCK")).toBe("rock");
    expect(mapSurface("")).toBe("native");
  });
});

describe("mapDifficulty", () => {
  it("maps USFS trail class to difficulty", () => {
    expect(mapDifficulty("1")).toBe("easy");
    expect(mapDifficulty("3")).toBe("moderate");
    expect(mapDifficulty("5")).toBe("difficult");
  });

  it("returns null rather than guessing", () => {
    expect(mapDifficulty("")).toBeNull();
    expect(mapDifficulty("N/A")).toBeNull();
  });
});

describe("classifyParcelOwner", () => {
  it("groups public owners", () => {
    expect(classifyParcelOwner("UNITED STATES OF AMERICA")).toBe("USDA Forest Service");
    expect(classifyParcelOwner("Alaska Mental Health Trust Authority")).toBe(
      "Alaska Mental Health Trust",
    );
    expect(classifyParcelOwner("KETCHIKAN GATEWAY BOROUGH")).toBe("Ketchikan Gateway Borough");
    expect(classifyParcelOwner("CITY OF SAXMAN")).toBe("City of Saxman");
    expect(classifyParcelOwner("CAPE FOX CORPORATION")).toBe("Native corporation / tribal");
  });

  it("falls back to Private and ignores blanks", () => {
    expect(classifyParcelOwner("SMITH JOHN A")).toBe("Private");
    expect(classifyParcelOwner("")).toBeNull();
  });
});

describe("coordinate rounding", () => {
  it("trims upstream float noise to ~11 cm", () => {
    expect(roundPosition([-131.46781561568346, 55.30064462167578])).toEqual([
      -131.467816, 55.300645,
    ]);
  });

  it("drops vertices that collapse onto each other", () => {
    expect(dedupe([[1, 1], [1, 1], [2, 2]])).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  it("drops MultiLineString parts that collapse below two points", () => {
    const rounded = roundGeometry({
      type: "MultiLineString",
      coordinates: [
        [
          [-131.1111111, 55.1111111],
          [-131.11111119, 55.11111119],
        ],
        [
          [-131.2, 55.2],
          [-131.3, 55.3],
        ],
      ],
    });
    expect(rounded.type).toBe("MultiLineString");
    expect((rounded.coordinates as number[][][]).length).toBe(1);
  });
});

describe("minSeparationMeters", () => {
  const line = (coords: number[][]) => turf.lineString(coords);

  it("returns 0 for crossing trails", () => {
    const a = line([
      [-131.6, 55.3],
      [-131.5, 55.4],
    ]);
    const b = line([
      [-131.6, 55.4],
      [-131.5, 55.3],
    ]);
    expect(minSeparationMeters(a, b)).toBe(0);
  });

  it("finds a tee junction where an endpoint meets the middle of another trail", () => {
    const spine = line([
      [-131.6, 55.3],
      [-131.6, 55.5],
    ]);
    const spur = line([
      [-131.6, 55.4],
      [-131.55, 55.4],
    ]);
    expect(minSeparationMeters(spine, spur)).toBeLessThan(1);
  });

  it("reports a real gap between separated trails", () => {
    const a = line([
      [-131.6, 55.3],
      [-131.6, 55.31],
    ]);
    const b = line([
      [-131.6, 55.4],
      [-131.6, 55.41],
    ]);
    expect(minSeparationMeters(a, b)).toBeGreaterThan(9000);
  });
});

describe("computeCorridorTotals", () => {
  it("counts needs-work as built ground and only proposed as gap", () => {
    const totals = computeCorridorTotals([
      { status: "existing", lengthMi: 4 },
      { status: "needs-work", lengthMi: 2 },
      { status: "proposed", lengthMi: 4 },
    ]);
    expect(totals).toEqual({
      totalMi: 10,
      existingMi: 6,
      gapMi: 4,
      percentComplete: 60,
    });
  });

  it("does not divide by zero on an empty corridor", () => {
    expect(computeCorridorTotals([])).toEqual({
      totalMi: 0,
      existingMi: 0,
      gapMi: 0,
      percentComplete: 0,
    });
  });

  it("treats under-construction as neither built nor gap", () => {
    const totals = computeCorridorTotals([
      { status: "existing", lengthMi: 1 },
      { status: "under-construction", lengthMi: 1 },
    ]);
    expect(totals.existingMi).toBe(1);
    expect(totals.gapMi).toBe(0);
    expect(totals.totalMi).toBe(2);
  });
});
