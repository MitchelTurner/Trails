import { describe, expect, it } from "vitest";
import { eventDayKey, isOnOrAfterToday, todayKey } from "../src/lib/work-parties.ts";

describe("work party dates", () => {
  const octoberThird = new Date("2026-10-03T18:00:00Z");

  it("treats a YAML date as its calendar day", () => {
    expect(eventDayKey(new Date("2026-09-13"))).toBe("2026-09-13");
  });

  it("keeps a party on the calendar the day it happens", () => {
    expect(isOnOrAfterToday(new Date("2026-10-03"), octoberThird)).toBe(true);
  });

  it("drops a party the day after it happens", () => {
    expect(isOnOrAfterToday(new Date("2026-09-27"), octoberThird)).toBe(false);
    expect(isOnOrAfterToday(new Date("2026-09-13"), octoberThird)).toBe(false);
  });

  it("formats today in Sitka", () => {
    expect(todayKey(octoberThird)).toBe("2026-10-03");
  });
});
