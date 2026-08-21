import { describe, it, expect } from "vitest";
import {
  roomDraftSchema,
  roomCapacity,
  roomPricePerNight,
  roomPricingForSeason,
  roomStayBreakdown,
  roomStayPrice,
} from "./room";
import type { Room } from "./types";

describe("roomDraftSchema", () => {
  it("accepts a valid room and applies defaults", () => {
    const result = roomDraftSchema.parse({
      name: "Garden Room",
      beds: { double: 1, single: 0 },
      basePrice: 350,
    });
    expect(result.isActive).toBe(true);
    expect(result.description).toBe("");
    expect(result.sortOrder).toBe(0);
  });

  it("requires a name", () => {
    expect(
      roomDraftSchema.safeParse({ name: "  ", beds: { double: 1, single: 0 }, basePrice: 100 })
        .success,
    ).toBe(false);
  });

  it("requires at least one bed", () => {
    expect(
      roomDraftSchema.safeParse({ name: "A", beds: { double: 0, single: 0 }, basePrice: 100 })
        .success,
    ).toBe(false);
  });

  it("rejects negative bed counts", () => {
    expect(
      roomDraftSchema.safeParse({ name: "A", beds: { double: -1, single: 2 }, basePrice: 100 })
        .success,
    ).toBe(false);
  });

  it("rejects negative base price", () => {
    expect(
      roomDraftSchema.safeParse({ name: "A", beds: { double: 1, single: 0 }, basePrice: -1 })
        .success,
    ).toBe(false);
  });
});

describe("roomCapacity", () => {
  it("counts a double bed as two guests and a single as one", () => {
    expect(roomCapacity({ double: 1, single: 0 })).toBe(2);
    expect(roomCapacity({ double: 1, single: 2 })).toBe(4);
    expect(roomCapacity({ double: 0, single: 3 })).toBe(3);
  });
});

describe("roomPricePerNight", () => {
  const room = { basePrice: 400, includedAdults: 2, extraAdultPrice: 80, extraChildPrice: 50 };

  it("returns the base price when the party fits the included adults", () => {
    expect(roomPricePerNight(room, { adults: 2, children: 0 })).toBe(400);
    expect(roomPricePerNight(room, { adults: 1, children: 0 })).toBe(400);
  });

  it("adds a surcharge for each adult beyond the included count", () => {
    expect(roomPricePerNight(room, { adults: 4, children: 0 })).toBe(400 + 2 * 80);
  });

  it("adds a surcharge for every child", () => {
    expect(roomPricePerNight(room, { adults: 2, children: 3 })).toBe(400 + 3 * 50);
  });

  it("combines additional adults and children", () => {
    expect(roomPricePerNight(room, { adults: 3, children: 1 })).toBe(400 + 80 + 50);
  });

  it("defaults to 2 included adults and no surcharge when fields are missing", () => {
    expect(roomPricePerNight({ basePrice: 300 }, { adults: 5, children: 2 })).toBe(300);
  });
});

const seasonalRoom: Room = {
  id: "r1",
  name: "Garden",
  description: "",
  beds: { double: 1, single: 0 },
  basePrice: 400,
  includedAdults: 2,
  extraAdultPrice: 80,
  extraChildPrice: 50,
  highSeason: { basePrice: 700, includedAdults: 2, extraAdultPrice: 120, extraChildPrice: 70 },
  isActive: true,
  sortOrder: 0,
  externalRefs: {},
};

describe("roomPricingForSeason", () => {
  it("returns the low-season set outside high season", () => {
    expect(roomPricingForSeason(seasonalRoom, false).basePrice).toBe(400);
  });

  it("returns the high-season set in high season", () => {
    expect(roomPricingForSeason(seasonalRoom, true).basePrice).toBe(700);
  });

  it("falls back to the low-season set when no high-season prices are set", () => {
    const room = { ...seasonalRoom, highSeason: undefined };
    expect(roomPricingForSeason(room, true).basePrice).toBe(400);
  });
});

describe("roomPricePerNight weekend base", () => {
  const pricing = { basePrice: 400, weekendBasePrice: 550, extraAdultPrice: 80, extraChildPrice: 50 };

  it("uses the midweek base on weekdays", () => {
    expect(roomPricePerNight(pricing, { adults: 2, children: 0 }, false)).toBe(400);
  });

  it("uses the weekend base on weekends", () => {
    expect(roomPricePerNight(pricing, { adults: 2, children: 0 }, true)).toBe(550);
  });

  it("falls back to the midweek base when no weekend base is set", () => {
    expect(roomPricePerNight({ basePrice: 400 }, { adults: 2, children: 0 }, true)).toBe(400);
  });

  it("adds surcharges on top of the weekend base", () => {
    expect(roomPricePerNight(pricing, { adults: 3, children: 1 }, true)).toBe(550 + 80 + 50);
  });
});

describe("roomStayPrice", () => {
  it("sums low-season nights", () => {
    // 2026-05-01..03 = 2 nights, all low season.
    expect(roomStayPrice(seasonalRoom, { adults: 2, children: 0 }, "2026-05-01", "2026-05-03", () => false)).toBe(800);
  });

  it("mixes weekday and weekend base prices", () => {
    const room = { ...seasonalRoom, weekendBasePrice: 600, highSeason: undefined };
    const isWeekend = (d: string) => d === "2026-05-02";
    // 2026-05-01 midweek (400) + 2026-05-02 weekend (600) = 1000.
    expect(
      roomStayPrice(room, { adults: 2, children: 0 }, "2026-05-01", "2026-05-03", () => false, isWeekend),
    ).toBe(1000);
  });

  it("mixes low and high season nights", () => {
    const isHigh = (d: string) => d === "2026-05-02";
    // 2026-05-01 low (400) + 2026-05-02 high (700) = 1100.
    expect(roomStayPrice(seasonalRoom, { adults: 2, children: 0 }, "2026-05-01", "2026-05-03", isHigh)).toBe(1100);
  });

  it("applies surcharges per night for the matching season", () => {
    const isHigh = (d: string) => d === "2026-05-02";
    // low night: 400 + 1 extra adult*80 + 1 child*50 = 530
    // high night: 700 + 1 extra adult*120 + 1 child*70 = 890
    expect(roomStayPrice(seasonalRoom, { adults: 3, children: 1 }, "2026-05-01", "2026-05-03", isHigh)).toBe(1420);
  });
});

describe("roomStayBreakdown", () => {
  it("groups nights by season and day-type in first-seen order", () => {
    const isHigh = (d: string) => d === "2026-05-02";
    const groups = roomStayBreakdown(
      seasonalRoom,
      { adults: 2, children: 0 },
      "2026-05-01",
      "2026-05-03",
      isHigh,
    );
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ high: false, weekend: false, nights: 1, perNight: 400, subtotal: 400 });
    expect(groups[1]).toMatchObject({ high: true, weekend: false, nights: 1, perNight: 700, subtotal: 700 });
  });

  it("captures the surcharge composition per group", () => {
    const groups = roomStayBreakdown(
      seasonalRoom,
      { adults: 3, children: 1 },
      "2026-05-01",
      "2026-05-02",
      () => false,
    );
    expect(groups[0]).toMatchObject({
      base: 400,
      extraAdults: 1,
      extraAdultPrice: 80,
      children: 1,
      extraChildPrice: 50,
      perNight: 530,
    });
  });

  it("subtotals sum to roomStayPrice", () => {
    const isHigh = (d: string) => d >= "2026-05-02";
    const isWeekend = (d: string) => d === "2026-05-03";
    const room = { ...seasonalRoom, weekendBasePrice: 500 };
    const total = roomStayPrice(room, { adults: 2, children: 0 }, "2026-05-01", "2026-05-05", isHigh, isWeekend);
    const groups = roomStayBreakdown(room, { adults: 2, children: 0 }, "2026-05-01", "2026-05-05", isHigh, isWeekend);
    expect(groups.reduce((s, g) => s + g.subtotal, 0)).toBe(total);
  });
});