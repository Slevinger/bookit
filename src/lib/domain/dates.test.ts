import { describe, it, expect } from "vitest";
import { rangesOverlap, nightsBetween, eachDateInRange, isValidRange, todayISO } from "./dates";

describe("rangesOverlap ([checkIn, checkOut) semantics)", () => {
  it("detects a plain overlap", () => {
    expect(rangesOverlap("2026-08-10", "2026-08-15", "2026-08-12", "2026-08-20")).toBe(true);
  });

  it("treats back-to-back stays as NOT overlapping (checkout day = next checkin day)", () => {
    expect(rangesOverlap("2026-08-10", "2026-08-12", "2026-08-12", "2026-08-14")).toBe(false);
    expect(rangesOverlap("2026-08-12", "2026-08-14", "2026-08-10", "2026-08-12")).toBe(false);
  });

  it("detects containment", () => {
    expect(rangesOverlap("2026-08-10", "2026-08-20", "2026-08-12", "2026-08-13")).toBe(true);
    expect(rangesOverlap("2026-08-12", "2026-08-13", "2026-08-10", "2026-08-20")).toBe(true);
  });

  it("detects identical ranges", () => {
    expect(rangesOverlap("2026-08-10", "2026-08-12", "2026-08-10", "2026-08-12")).toBe(true);
  });

  it("returns false for disjoint ranges", () => {
    expect(rangesOverlap("2026-08-01", "2026-08-05", "2026-08-10", "2026-08-12")).toBe(false);
  });
});

describe("nightsBetween", () => {
  it("counts nights", () => {
    expect(nightsBetween("2026-08-10", "2026-08-12")).toBe(2);
    expect(nightsBetween("2026-08-10", "2026-08-11")).toBe(1);
  });

  it("crosses month boundaries", () => {
    expect(nightsBetween("2026-08-30", "2026-09-02")).toBe(3);
  });
});

describe("eachDateInRange", () => {
  it("returns each date including start, excluding end", () => {
    expect(eachDateInRange("2026-08-30", "2026-09-02")).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
    ]);
  });
});

describe("isValidRange", () => {
  it("requires checkOut strictly after checkIn", () => {
    expect(isValidRange("2026-08-10", "2026-08-11")).toBe(true);
    expect(isValidRange("2026-08-10", "2026-08-10")).toBe(false);
    expect(isValidRange("2026-08-11", "2026-08-10")).toBe(false);
  });

  it("rejects malformed dates", () => {
    expect(isValidRange("not-a-date", "2026-08-10")).toBe(false);
    expect(isValidRange("2026-08-10", "2026-13-40")).toBe(false);
  });
});

describe("todayISO", () => {
  it("returns YYYY-MM-DD", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
