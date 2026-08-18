import { describe, it, expect } from "vitest";
import { bookingBlocksRoom, computeAvailability, findConflicts } from "./availability";
import type { Booking, Room } from "./types";

const room = (id: string, overrides: Partial<Room> = {}): Room => ({
  id,
  name: `Room ${id}`,
  description: "",
  beds: { double: 1, single: 0 },
  basePrice: 100,
  isActive: true,
  sortOrder: 0,
  externalRefs: {},
  ...overrides,
});

const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: "b1",
  rooms: [{ roomId: "r1", price: 100 }],
  guests: { adults: 2, children: 0 },
  contacts: [{ name: "Dana", phone: "050-1234567" }],
  checkIn: "2026-08-10",
  checkOut: "2026-08-12",
  status: "confirmed",  notes: [],
  source: "manual",
  createdAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

describe("bookingBlocksRoom", () => {
  it("blocks when confirmed booking includes the room and overlaps", () => {
    expect(bookingBlocksRoom(booking(), "r1", "2026-08-11", "2026-08-13")).toBe(true);
  });

  it("does not block for other rooms", () => {
    expect(bookingBlocksRoom(booking(), "r2", "2026-08-11", "2026-08-13")).toBe(false);
  });

  it("does not block when cancelled", () => {
    expect(bookingBlocksRoom(booking({ status: "cancelled" }), "r1", "2026-08-11", "2026-08-13")).toBe(false);
  });

  it("does not block for non-overlapping dates", () => {
    expect(bookingBlocksRoom(booking(), "r1", "2026-08-12", "2026-08-14")).toBe(false);
  });

  it("blocks all rooms of a multi-room booking", () => {
    const b = booking({ rooms: [{ roomId: "r1", price: 100 }, { roomId: "r2", price: 120 }] });
    expect(bookingBlocksRoom(b, "r1", "2026-08-11", "2026-08-13")).toBe(true);
    expect(bookingBlocksRoom(b, "r2", "2026-08-11", "2026-08-13")).toBe(true);
  });
});

describe("findConflicts", () => {
  it("excludes a booking by id (for edit flows)", () => {
    const conflicts = findConflicts([booking()], "r1", "2026-08-10", "2026-08-12", "b1");
    expect(conflicts).toHaveLength(0);
  });

  it("returns overlapping confirmed bookings", () => {
    const other = booking({ id: "b2", checkIn: "2026-08-11", checkOut: "2026-08-14" });
    const conflicts = findConflicts([booking(), other], "r1", "2026-08-11", "2026-08-12");
    expect(conflicts.map((b) => b.id).sort()).toEqual(["b1", "b2"]);
  });
});

describe("computeAvailability", () => {
  const rooms = [room("r1"), room("r2"), room("r3", { isActive: false })];

  it("marks busy rooms with their conflicts and free rooms as available", () => {
    const result = computeAvailability(rooms, [booking()], "2026-08-11", "2026-08-13");
    const r1 = result.find((r) => r.room.id === "r1")!;
    const r2 = result.find((r) => r.room.id === "r2")!;
    expect(r1.available).toBe(false);
    expect(r1.conflicts).toHaveLength(1);
    expect(r2.available).toBe(true);
    expect(r2.conflicts).toHaveLength(0);
  });

  it("excludes inactive rooms", () => {
    const result = computeAvailability(rooms, [], "2026-08-11", "2026-08-13");
    expect(result.map((r) => r.room.id)).toEqual(["r1", "r2"]);
  });

  it("sorts by room sortOrder", () => {
    const result = computeAvailability(
      [room("a", { sortOrder: 2 }), room("b", { sortOrder: 1 })],
      [],
      "2026-08-11",
      "2026-08-13",
    );
    expect(result.map((r) => r.room.id)).toEqual(["b", "a"]);
  });
});
