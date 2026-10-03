import { describe, expect, it } from "vitest";
import {
  SEATRAILS,
  communities,
  guideTrails,
  guideTrailsOnMap,
  ketchikanRoutes,
  publishedUrls,
} from "../src/data/seatrails.ts";

describe("SEAtrails record", () => {
  it("lists the nineteen communities that passed resolutions", () => {
    expect(communities).toHaveLength(19);
    expect(new Set(communities.map((community) => community.name)).size).toBe(19);
  });

  it("marks only Ketchikan as the community this map covers", () => {
    const home = communities.filter((community) => community.home);
    expect(home.map((community) => community.name)).toEqual(["Ketchikan"]);
  });

  it("carries five of the six named Ketchikan guide trails onto this map", () => {
    expect(guideTrails()).toHaveLength(6);
    expect(guideTrailsOnMap()).toHaveLength(5);
    expect(guideTrailsOnMap().every((route) => route.href?.startsWith("/"))).toBe(true);
  });

  it("keeps the marine route in the record and off the foot-trail map", () => {
    const marine = ketchikanRoutes.find((route) => route.archiveName.includes("Marine"));
    expect(marine?.inGuideList).toBe(false);
    expect(marine?.onMap).toBe(false);
    expect(marine?.href).toBeNull();
  });

  it("points the archive at akseatrails.org and never publishes the lost domain", () => {
    expect(SEATRAILS.archiveUrl).toBe("https://akseatrails.org/");
    expect(SEATRAILS.lostDomain).toBe("seatrails.org");
    const leaked = publishedUrls().filter((url) => {
      const host = new URL(url, "https://revillatrails.org").hostname;
      return host === "seatrails.org" || host.endsWith(".seatrails.org");
    });
    expect(leaked).toEqual([]);
  });

  it("links every community guide and resolution on the archive", () => {
    for (const community of communities) {
      expect(new URL(community.guideUrl).hostname).toBe("akseatrails.org");
      expect(new URL(community.resolutionUrl).hostname).toBe("akseatrails.org");
      expect(community.resolutionUrl).toContain("/files/resolutions/");
    }
  });
});
