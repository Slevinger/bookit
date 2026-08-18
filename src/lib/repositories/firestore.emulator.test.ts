/**
 * Integration tests against the Firestore emulator.
 * Run with: FIRESTORE_EMULATOR_HOST=localhost:8080 npm test
 * Skipped automatically when the emulator is not configured.
 */
import { describe, it, expect } from "vitest";
import type { BookingDraft } from "@/lib/domain/types";
import { BookingConflictError } from "./types";

const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;

const draft = (overrides: Partial<BookingDraft> = {}) => ({
  rooms: [{ roomId: "r1", price: 350 }],
  guests: { adults: 2, children: 0 },
  contacts: [{ name: "Dana", phone: "050-1234567" }],
  checkIn: "2026-08-10",
  checkOut: "2026-08-12",
  status: "confirmed" as const,  notes: [],
  source: "manual" as const,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe.skipIf(!emulator)("firestore repositories (emulator)", () => {
  async function setup() {
    process.env.GCLOUD_PROJECT ??= "bookit-test";
    const { getDb } = await import("@/lib/firestore/client");
    const { createFirestoreBookingRepository, createFirestoreRoomRepository } = await import(
      "./firestore"
    );
    const db = getDb();
    for (const name of ["rooms", "bookings"]) {
      const snap = await db.collection(name).get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    }
    return {
      bookingRepo: createFirestoreBookingRepository(db),
      roomRepo: createFirestoreRoomRepository(db),
    };
  }

  it("creates and lists rooms", async () => {
    const { roomRepo } = await setup();
    const room = await roomRepo.create({
      name: "Garden", description: "", beds: { double: 1, single: 0 }, basePrice: 350,
      isActive: true, sortOrder: 0, externalRefs: {},
    });
    expect((await roomRepo.list()).map((r) => r.id)).toContain(room.id);
  });

  it("creates a booking and blocks conflicting multi-room booking transactionally", async () => {
    const { bookingRepo } = await setup();
    await bookingRepo.createChecked(draft());
    await expect(
      bookingRepo.createChecked(
        draft({ rooms: [{ roomId: "r1", price: 350 }, { roomId: "r2", price: 500 }] }),
      ),
    ).rejects.toBeInstanceOf(BookingConflictError);
  });

  it("allows back-to-back bookings", async () => {
    const { bookingRepo } = await setup();
    await bookingRepo.createChecked(draft());
    await expect(
      bookingRepo.createChecked(draft({ checkIn: "2026-08-12", checkOut: "2026-08-14" })),
    ).resolves.toBeTruthy();
  });

  it("updateChecked re-checks availability excluding itself", async () => {
    const { bookingRepo } = await setup();
    const booking = await bookingRepo.createChecked(draft());
    await expect(
      bookingRepo.updateChecked(booking.id, { checkIn: "2026-08-11", checkOut: "2026-08-13" }),
    ).resolves.toBeTruthy();
  });

  it("frees dates when a booking is cancelled", async () => {
    const { bookingRepo } = await setup();
    const booking = await bookingRepo.createChecked(draft());
    await bookingRepo.updateChecked(booking.id, { status: "cancelled" });
    await expect(bookingRepo.createChecked(draft())).resolves.toBeTruthy();
  });
});
