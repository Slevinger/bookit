import { findConflicts } from "@/lib/domain/availability";
import { rangesOverlap } from "@/lib/domain/dates";
import type { Booking, Room } from "@/lib/domain/types";
import { BookingConflictError, NotFoundError } from "./types";
import type { BookingRepository, RoomRepository } from "./types";

/** In-memory repositories for tests and local prototyping. */
export function createInMemoryRepos(seed?: { rooms?: Room[]; bookings?: Booking[] }) {
  const rooms = new Map<string, Room>((seed?.rooms ?? []).map((r) => [r.id, r]));
  const bookings = new Map<string, Booking>((seed?.bookings ?? []).map((b) => [b.id, b]));
  let nextId = 1;
  const genId = (prefix: string) => `${prefix}_${nextId++}`;

  const roomRepo: RoomRepository = {
    async list() {
      return [...rooms.values()].sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async get(id) {
      return rooms.get(id) ?? null;
    },
    async create(data) {
      const room: Room = { ...data, id: genId("room") };
      rooms.set(room.id, room);
      return room;
    },
    async update(id, patch) {
      const existing = rooms.get(id);
      if (!existing) throw new NotFoundError("Room", id);
      const updated = { ...existing, ...patch };
      rooms.set(id, updated);
      return updated;
    },
  };

  const assertNoConflicts = (
    candidate: Pick<Booking, "rooms" | "checkIn" | "checkOut">,
    excludeId?: string,
  ) => {
    const all = [...bookings.values()];
    const conflicting = candidate.rooms
      .map((r) => r.roomId)
      .filter(
        (roomId) =>
          findConflicts(all, roomId, candidate.checkIn, candidate.checkOut, excludeId).length > 0,
      );
    if (conflicting.length > 0) throw new BookingConflictError(conflicting);
  };

  const bookingRepo: BookingRepository = {
    async list() {
      return [...bookings.values()];
    },
    async get(id) {
      return bookings.get(id) ?? null;
    },
    async listOverlapping(from, to) {
      return [...bookings.values()].filter((b) => rangesOverlap(b.checkIn, b.checkOut, from, to));
    },
    async createChecked(data) {
      if (data.status === "confirmed") assertNoConflicts(data);
      const booking: Booking = { ...data, id: genId("bkg") };
      bookings.set(booking.id, booking);
      return booking;
    },
    async update(id, patch) {
      const existing = bookings.get(id);
      if (!existing) throw new NotFoundError("Booking", id);
      const updated: Booking = { ...existing, ...patch, id, createdAt: existing.createdAt };
      bookings.set(id, updated);
      return updated;
    },
    async updateChecked(id, patch) {
      const existing = bookings.get(id);
      if (!existing) throw new NotFoundError("Booking", id);
      const updated: Booking = { ...existing, ...patch, id, createdAt: existing.createdAt };
      if (updated.status === "confirmed") assertNoConflicts(updated, id);
      bookings.set(id, updated);
      return updated;
    },
  };

  return { roomRepo, bookingRepo };
}
