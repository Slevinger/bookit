import { describe, it, expect } from "vitest";
import {
  emptyTariff,
  hasTariff,
  tariffPricePerNight,
  tariffSchema,
  tariffStayPrice,
} from "./tariff";
import type { Tariff } from "./types";

const tariff: Tariff = {
  adultPrice: 100,
  childPrice: 40,
  combinations: [
    { adults: 2, children: 0, price: 180 },
    { adults: 2, children: 2, price: 300 },
  ],
};

describe("tariffPricePerNight", () => {
  it("uses an exact (adults, children) combination when defined", () => {
    expect(tariffPricePerNight(tariff, { adults: 2, children: 0 })).toBe(180);
    expect(tariffPricePerNight(tariff, { adults: 2, children: 2 })).toBe(300);
  });

  it("falls back to per-adult and per-child prices otherwise", () => {
    expect(tariffPricePerNight(tariff, { adults: 3, children: 1 })).toBe(3 * 100 + 1 * 40);
    expect(tariffPricePerNight(tariff, { adults: 1, children: 0 })).toBe(100);
  });
});

describe("tariffStayPrice", () => {
  it("multiplies the nightly price by the number of nights", () => {
    expect(tariffStayPrice(tariff, { adults: 2, children: 0 }, 3)).toBe(540);
  });

  it("treats a non-positive stay as a single night", () => {
    expect(tariffStayPrice(tariff, { adults: 2, children: 0 }, 0)).toBe(180);
  });
});

describe("hasTariff", () => {
  it("is false for an empty or missing tariff", () => {
    expect(hasTariff(undefined)).toBe(false);
    expect(hasTariff(null)).toBe(false);
    expect(hasTariff(emptyTariff())).toBe(false);
  });

  it("is true once any figure is set", () => {
    expect(hasTariff({ adultPrice: 100, childPrice: 0, combinations: [] })).toBe(true);
    expect(
      hasTariff({ adultPrice: 0, childPrice: 0, combinations: [{ adults: 2, children: 0, price: 1 }] }),
    ).toBe(true);
  });
});

describe("tariffSchema", () => {
  it("defaults combinations to an empty array", () => {
    const parsed = tariffSchema.parse({ adultPrice: 100, childPrice: 50 });
    expect(parsed.combinations).toEqual([]);
  });

  it("rejects duplicate combinations", () => {
    const result = tariffSchema.safeParse({
      adultPrice: 0,
      childPrice: 0,
      combinations: [
        { adults: 2, children: 0, price: 100 },
        { adults: 2, children: 0, price: 120 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative prices", () => {
    expect(tariffSchema.safeParse({ adultPrice: -1, childPrice: 0 }).success).toBe(false);
  });
});
