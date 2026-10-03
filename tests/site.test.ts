import { describe, expect, it } from "vitest";
import { site } from "../src/config/site.ts";

describe("public identity", () => {
  it("publishes as SEAtrails on the revillatrails.org hostname", () => {
    expect(site.name).toBe("SEAtrails");
    expect(site.orgName).toBe("SEAtrails");
    expect(site.workingName).toBe("Revilla Trails");
    expect(new URL(site.url).hostname).toBe("revillatrails.org");
    expect(site.url.includes("seatrails.org")).toBe(false);
    expect(site.email).toBe("hello@revillatrails.org");
    expect(site.features.donations).toBe(false);
  });
});
