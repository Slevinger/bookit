import type { CollectionReference, Transaction } from "firebase-admin/firestore";
import type { Booking, Room } from "@/lib/domain/types";
import { findConflicts } from "@/lib/domain/availability";
import {
  BookingConflictError,
  NotFoundError,
  type BookingRepository,
  type RoomRepository,
} from "./types";

type RoomData = Omit<Room, "id">;
type BookingData = Omit<Booking, "id">;

const withId = <T>(id: string, data: T) => ({ id, ...data });

/** Rooms saved before the beds model had a numeric `capacity` field instead. */
const migrateRoom = (data: RoomData & { capacity?: number }): RoomData => {
  if (data.beds) return data;
  const capacity = Math.max(1, data.capacity ?? 2);
  return { ...data, beds: { double: Math.floor(capacity / 2), single: capacity % 2 } };
};

/** `rooms` is the tenant-scoped collection (`tenants/{tenantId}/rooms`). */
export const createFirestoreRoomRepository = (rooms: CollectionReference): RoomRepository => ({
  async list() {
    const snap = await rooms.get();
    return snap.docs
      .map((d) => withId(d.id, migrateRoom(d.data() as RoomData)))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  },
  async get(id) {
    const doc = await rooms.doc(id).get();
    return doc.exists ? withId(doc.id, migrateRoom(doc.data() as RoomData)) : null;
  },
  async create(room) {
    const ref = await rooms.add(room);
    return withId(ref.id, room);
  },
  async update(id, patch) {
    const ref = rooms.doc(id);
    const doc = await ref.get();
    if (!doc.exists) throw new NotFoundError("Room", id);
    await ref.update(patch);
    return withId(id, { ...(doc.data() as RoomData), ...patch });
  },
});

/**
 * Conflict checking strategy: inside a transaction, read all confirmed
 * bookings whose checkOut is after the new checkIn (the only ones that can
 * overlap), then verify no room collision in memory before writing. Firestore
 * transactions use optimistic locking on the queried documents, so two
 * concurrent conflicting writes cannot both commit.
 */
const assertNoConflictsTx = async (
  bookings: CollectionReference,
  tx: Transaction,
  booking: Pick<Booking, "rooms" | "checkIn" | "checkOut">,
  excludeBookingId?: string,
) => {
  // Single-field range query only (a status+checkOut filter would require a
  // composite Firestore index); findConflicts ignores cancelled bookings.
  const snap = await tx.get(bookings.where("checkOut", ">", booking.checkIn));
  const candidates = snap.docs.map((d) => withId(d.id, d.data() as BookingData));
  const conflicting = booking.rooms
    .map((r) => r.roomId)
    .filter(
      (roomId) =>
        findConflicts(candidates, roomId, booking.checkIn, booking.checkOut, excludeBookingId)
          .length > 0,
    );
  if (conflicting.length > 0) throw new BookingConflictError(conflicting);
};

/** Bookings saved before typed notes had a single free-text `notes` string. */
const migrateBooking = (data: BookingData & { notes?: BookingData["notes"] | string }): BookingData => {
  if (typeof data.notes === "string") {
    return { ...data, notes: data.notes ? [{ type: "info", text: data.notes }] : [] };
  }
  return { ...data, notes: data.notes ?? [] };
};

/** `bookings` is the tenant-scoped collection (`tenants/{tenantId}/bookings`). */
export const createFirestoreBookingRepository = (
  bookings: CollectionReference,
): BookingRepository => {
  const db = bookings.firestore;
  return {
    async list() {
      const snap = await bookings.orderBy("checkIn", "desc").get();
      return snap.docs.map((d) => withId(d.id, migrateBooking(d.data() as BookingData)));
    },
    async get(id) {
      const doc = await bookings.doc(id).get();
      return doc.exists ? withId(doc.id, migrateBooking(doc.data() as BookingData)) : null;
    },
    async listOverlapping(from, to) {
      const snap = await bookings.where("checkOut", ">", from).get();
      return snap.docs
        .map((d) => withId(d.id, migrateBooking(d.data() as BookingData)))
        .filter((b) => b.checkIn < to);
    },
    async createChecked(booking) {
      return db.runTransaction(async (tx) => {
        // Tentative bookings are only "interested" holds: they don't block dates.
        if (booking.status === "confirmed") await assertNoConflictsTx(bookings, tx, booking);
        const ref = bookings.doc();
        tx.set(ref, booking);
        return withId(ref.id, booking);
      });
    },
    async update(id, patch) {
      const ref = bookings.doc(id);
      const doc = await ref.get();
      if (!doc.exists) throw new NotFoundError("Booking", id);
      await ref.update(patch);
      return withId(id, { ...(doc.data() as BookingData), ...patch });
    },
    async updateChecked(id, patch) {
      return db.runTransaction(async (tx) => {
        const ref = bookings.doc(id);
        const doc = await tx.get(ref);
        if (!doc.exists) throw new NotFoundError("Booking", id);
        const merged = { ...(doc.data() as BookingData), ...patch };
        if (merged.status === "confirmed") await assertNoConflictsTx(bookings, tx, merged, id);
        tx.update(ref, patch);
        return withId(id, merged);
      });
    },
  };
};
