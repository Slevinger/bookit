import { describe, it, expect } from "vitest";
import { bookingToEvent } from "./event-mapping";
import type { Booking } from "@/lib/domain/types";

const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: "bkg_1",
  rooms: [{ roomId: "r1", price: 300 }],
  contacts: [{ name: "Dana", phone: "050-1234567" }],
  guests: { adults: 2, children: 1 },
  checkIn: "2026-08-10",
  checkOut: "2026-08-12",
  status: "confirmed",
  notes: [],
  source: "manual",
  createdAt: "2026-08-01T00:00:00.000Z",
  ...overrides,
});

describe("bookingToEvent", () => {
  it("maps dates to an all-day event with an exclusive checkout end", () => {
    const event = bookingToEvent(booking());
    expect(event.start).toEqual({ date: "2026-08-10" });
    expect(event.end).toEqual({ date: "2026-08-12" });
  });

  it("builds a summary from the guest name and room names when provided", () => {
    const event = bookingToEvent(booking(), ["Garden Room"]);
    expect(event.summary).toBe("Dana — Garden Room");
  });

  it("falls back to room ids when no room names are given", () => {
    const event = bookingToEvent(booking());
    expect(event.summary).toBe("Dana — r1");
  });

  it("falls back to a generic guest name when the contact has none", () => {
    const event = bookingToEvent(booking({ contacts: [{ name: "  ", phone: "" }] }));
    expect(event.summary?.startsWith("Guest")).toBe(true);
  });

  it("includes guest counts, phone and notes in the description", () => {
    const event = bookingToEvent(
      booking({ notes: [{ type: "info", text: "Late arrival" }] }),
    );
    expect(event.description).toContain("Guests: 3 (2 adults, 1 children)");
    expect(event.description).toContain("Phone: 050-1234567");
    expect(event.description).toContain("Late arrival");
    expect(event.description).toContain("Synced from BookIt");
  });

  it("tags the event with the booking id for traceability", () => {
    const event = bookingToEvent(booking());
    expect(event.extendedProperties?.private?.bookitBookingId).toBe("bkg_1");
  });
});
