import { describe, it, expect, vi } from "vitest";
import { createBookingService } from "./booking-service";
import { createEmitter } from "@/lib/events/emitter";
import { createInMemoryRepos } from "@/lib/repositories/in-memory";
import { BookingConflictError } from "@/lib/repositories/types";
import type { Booking, BookingDraft, Room } from "@/lib/domain/types";

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

const draft = (overrides: Partial<BookingDraft> = {}): BookingDraft => ({
  rooms: [{ roomId: "r1", price: 300 }],
  guests: { adults: 2, children: 0 },
  contacts: [{ name: "Dana", phone: "050-1234567" }],
  checkIn: "2026-08-10",
  checkOut: "2026-08-12",
  ...overrides,
});

const setup = (seedBookings: Booking[] = []) => {
  const { roomRepo, bookingRepo } = createInMemoryRepos({
    rooms: [room("r1"), room("r2")],
    bookings: seedBookings,
  });
  const emitter = createEmitter();
  const service = createBookingService({ roomRepo, bookingRepo, emitter });
  return { roomRepo, bookingRepo, emitter, service };
};

describe("createBooking", () => {
  it("creates a confirmed manual booking and emits booking.created", async () => {
    const { service, emitter } = setup();
    const created = vi.fn();
    emitter.on("booking.created", created);

    const booking = await service.createBooking(draft());

    expect(booking.id).toBeTruthy();
    expect(booking.status).toBe("confirmed");
    expect(booking.source).toBe("manual");
    expect(booking.createdAt).toBeTruthy();
    expect(created).toHaveBeenCalledWith({ booking });
  });

  it("rejects invalid drafts with validation details", async () => {
    const { service } = setup();
    await expect(service.createBooking(draft({ guests: { adults: 0, children: 1 } }))).rejects.toThrow();
  });

  it("rejects double booking of the same room and dates", async () => {
    const { service } = setup();
    await service.createBooking(draft());
    await expect(service.createBooking(draft())).rejects.toBeInstanceOf(BookingConflictError);
  });

  it("allows back-to-back bookings", async () => {
    const { service } = setup();
    await service.createBooking(draft());
    await expect(
      service.createBooking(draft({ checkIn: "2026-08-12", checkOut: "2026-08-14" })),
    ).resolves.toBeTruthy();
  });

  it("rejects a multi-room booking when any one room conflicts", async () => {
    const { service } = setup();
    await service.createBooking(draft());
    const multi = draft({
      rooms: [
        { roomId: "r1", price: 300 },
        { roomId: "r2", price: 250 },
      ],
    });
    await expect(service.createBooking(multi)).rejects.toBeInstanceOf(BookingConflictError);
  });
});

describe("bed shortfall warning", () => {
  it("adds an action-item note when the rooms don't sleep the whole party", async () => {
    const { service } = setup();
    // r1 has 1 double bed (sleeps 2) but 5 guests are coming.
    const booking = await service.createBooking(draft({ guests: { adults: 3, children: 2 } }));
    expect(booking.notes).toHaveLength(1);
    expect(booking.notes[0]).toMatchObject({ type: "action-item", code: "bed-shortfall" });
    expect(booking.notes[0].text).toMatch(/not ideal/i);
  });

  it("does not add the note when beds are enough", async () => {
    const { service } = setup();
    const booking = await service.createBooking(draft({ guests: { adults: 2, children: 0 } }));
    expect(booking.notes).toEqual([]);
  });

  it("removes the note when an edit resolves the shortage, keeping other notes", async () => {
    const { service } = setup();
    const booking = await service.createBooking(
      draft({
        guests: { adults: 3, children: 2 },
        notes: [{ type: "info", text: "Prefers ground floor" }],
      }),
    );
    expect(booking.notes).toHaveLength(2);

    const updated = await service.updateBooking(booking.id, draft({ guests: { adults: 2, children: 0 } }));
    expect(updated.notes).toEqual([{ type: "info", text: "Prefers ground floor" }]);
  });
});

describe("updateBooking", () => {
  it("updates dates when no conflict and emits booking.updated", async () => {
    const { service, emitter } = setup();
    const updated = vi.fn();
    emitter.on("booking.updated", updated);
    const booking = await service.createBooking(draft());

    const result = await service.updateBooking(booking.id, {
      ...draft({ checkIn: "2026-08-15", checkOut: "2026-08-17" }),
    });

    expect(result.checkIn).toBe("2026-08-15");
    expect(updated).toHaveBeenCalled();
  });

  it("does not conflict with itself when only editing details", async () => {
    const { service } = setup();
    const booking = await service.createBooking(draft());
    await expect(
      service.updateBooking(booking.id, draft({ guests: { adults: 3, children: 0 } })),
    ).resolves.toBeTruthy();
  });

  it("rejects moving onto another booking's dates", async () => {
    const { service } = setup();
    await service.createBooking(draft());
    const other = await service.createBooking(draft({ checkIn: "2026-08-20", checkOut: "2026-08-22" }));
    await expect(
      service.updateBooking(other.id, draft({ checkIn: "2026-08-10", checkOut: "2026-08-12" })),
    ).rejects.toBeInstanceOf(BookingConflictError);
  });
});

describe("cancelBooking", () => {
  it("sets status cancelled, emits event, and frees the room", async () => {
    const { service, emitter } = setup();
    const cancelled = vi.fn();
    emitter.on("booking.cancelled", cancelled);

    const booking = await service.createBooking(draft());
    await service.cancelBooking(booking.id);
    expect(cancelled).toHaveBeenCalled();

    await expect(service.createBooking(draft())).resolves.toBeTruthy();
  });
});

describe("checkAvailability", () => {
  it("returns per-room availability with conflicts for the range", async () => {
    const { service } = setup();
    await service.createBooking(draft());

    const result = await service.checkAvailability("2026-08-11", "2026-08-13");

    const r1 = result.find((r) => r.room.id === "r1")!;
    const r2 = result.find((r) => r.room.id === "r2")!;
    expect(r1.available).toBe(false);
    expect(r1.conflicts).toHaveLength(1);
    expect(r2.available).toBe(true);
  });

  it("can exclude a booking id for edit flows", async () => {
    const { service } = setup();
    const booking = await service.createBooking(draft());
    const result = await service.checkAvailability("2026-08-10", "2026-08-12", booking.id);
    expect(result.find((r) => r.room.id === "r1")!.available).toBe(true);
  });
});
