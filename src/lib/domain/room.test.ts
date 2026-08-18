import { describe, it, expect } from "vitest";
import { roomDraftSchema, roomCapacity, formatBeds } from "./room";

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

describe("formatBeds", () => {
  it("describes the beds in plain words", () => {
    expect(formatBeds({ double: 1, single: 0 })).toBe("1 double");
    expect(formatBeds({ double: 1, single: 2 })).toBe("1 double, 2 singles");
    expect(formatBeds({ double: 2, single: 1 })).toBe("2 doubles, 1 single");
  });
});
