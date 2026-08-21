import { describe, it, expect } from "vitest";
import { emptySeasonConfig, isHighSeason } from "./season";
import type { SeasonConfig } from "./types";

const config: SeasonConfig = {
  holidays: [
    { date: "2026-04-02", title: "Pesach" },
    { date: "2026-09-21", title: "Rosh Hashana" },
  ],
  manualRanges: [{ from: "2026-07-01", to: "2026-08-31", label: "Summer" }],
  importedYears: [2026],
};

describe("isHighSeason", () => {
  it("returns false with no config", () => {
    expect(isHighSeason("2026-04-02", null)).toBe(false);
    expect(isHighSeason("2026-04-02", emptySeasonConfig())).toBe(false);
  });

  it("matches an imported holiday date", () => {
    expect(isHighSeason("2026-04-02", config)).toBe(true);
    expect(isHighSeason("2026-09-21", config)).toBe(true);
  });

  it("matches dates inside a manual range (both ends inclusive)", () => {
    expect(isHighSeason("2026-07-01", config)).toBe(true);
    expect(isHighSeason("2026-08-15", config)).toBe(true);
    expect(isHighSeason("2026-08-31", config)).toBe(true);
  });

  it("returns false for ordinary dates", () => {
    expect(isHighSeason("2026-06-30", config)).toBe(false);
    expect(isHighSeason("2026-09-01", config)).toBe(false);
  });
});
