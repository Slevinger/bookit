import { describe, it, expect } from "vitest";
import { layoutRoomBars } from "./calendar-layout";
import type { Booking } from "./types";

const booking = (id: string, roomIds: string[], checkIn: string, checkOut: string): Booking => ({
  id,
  rooms: roomIds.map((roomId) => ({ roomId, price: 100 })),
  guests: { adults: 2, children: 0 },
  contacts: [{ name: "Dana", phone: "050" }],
  checkIn,
  checkOut,
  status: "confirmed",  notes: [],
  source: "manual",
  createdAt: "2026-08-01T00:00:00.000Z",
});

// Visible window: Aug 10 (index 0) .. Aug 16 (index 6), 7 days
const FROM = "2026-08-10";
const TO = "2026-08-17";

describe("layoutRoomBars", () => {
  it("positions a bar fully inside the window", () => {
    const bars = layoutRoomBars([booking("b1", ["r1"], "2026-08-11", "2026-08-13")], "r1", FROM, TO);
    expect(bars).toEqual([
      { booking: expect.objectContaining({ id: "b1" }), startIndex: 1, span: 2, clippedStart: false, clippedEnd: false },
    ]);
  });

  it("clips a bar that starts before the window", () => {
    const bars = layoutRoomBars([booking("b1", ["r1"], "2026-08-05", "2026-08-12")], "r1", FROM, TO);
    expect(bars[0]).toMatchObject({ startIndex: 0, span: 2, clippedStart: true, clippedEnd: false });
  });

  it("clips a bar that ends after the window", () => {
    const bars = layoutRoomBars([booking("b1", ["r1"], "2026-08-15", "2026-08-20")], "r1", FROM, TO);
    expect(bars[0]).toMatchObject({ startIndex: 5, span: 2, clippedStart: false, clippedEnd: true });
  });

  it("ignores bookings for other rooms, cancelled, or outside the window", () => {
    const bookings = [
      booking("other-room", ["r2"], "2026-08-11", "2026-08-13"),
      { ...booking("cancelled", ["r1"], "2026-08-11", "2026-08-13"), status: "cancelled" as const },
      booking("before", ["r1"], "2026-08-01", "2026-08-05"),
    ];
    expect(layoutRoomBars(bookings, "r1", FROM, TO)).toEqual([]);
  });

  it("returns bars sorted by start", () => {
    const bookings = [
      booking("late", ["r1"], "2026-08-14", "2026-08-16"),
      booking("early", ["r1"], "2026-08-10", "2026-08-12"),
    ];
    const bars = layoutRoomBars(bookings, "r1", FROM, TO);
    expect(bars.map((b) => b.booking.id)).toEqual(["early", "late"]);
  });

  it("multi-room booking produces a bar on each of its rooms", () => {
    const b = booking("multi", ["r1", "r2"], "2026-08-11", "2026-08-13");
    expect(layoutRoomBars([b], "r1", FROM, TO)).toHaveLength(1);
    expect(layoutRoomBars([b], "r2", FROM, TO)).toHaveLength(1);
  });
});
