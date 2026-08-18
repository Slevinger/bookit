import { rangesOverlap } from "./dates";
import type { Booking, ISODate, Room, RoomAvailability } from "./types";

export const bookingBlocksRoom = (
  booking: Booking,
  roomId: string,
  checkIn: ISODate,
  checkOut: ISODate,
): boolean =>
  booking.status === "confirmed" &&
  booking.rooms.some((r) => r.roomId === roomId) &&
  rangesOverlap(booking.checkIn, booking.checkOut, checkIn, checkOut);

/**
 * Non-cancelled bookings (confirmed or tentative) overlapping the room/range.
 * Used for timeline display; tentative overlaps don't make a room unavailable.
 */
export const bookingOverlapsRoom = (
  booking: Booking,
  roomId: string,
  checkIn: ISODate,
  checkOut: ISODate,
): boolean =>
  booking.status !== "cancelled" &&
  booking.rooms.some((r) => r.roomId === roomId) &&
  rangesOverlap(booking.checkIn, booking.checkOut, checkIn, checkOut);

export const findConflicts = (
  bookings: Booking[],
  roomId: string,
  checkIn: ISODate,
  checkOut: ISODate,
  excludeBookingId?: string,
): Booking[] =>
  bookings.filter(
    (b) => b.id !== excludeBookingId && bookingBlocksRoom(b, roomId, checkIn, checkOut),
  );

export const computeAvailability = (
  rooms: Room[],
  bookings: Booking[],
  checkIn: ISODate,
  checkOut: ISODate,
  excludeBookingId?: string,
): RoomAvailability[] =>
  rooms
    .filter((room) => room.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((room) => {
      const conflicts = findConflicts(bookings, room.id, checkIn, checkOut, excludeBookingId);
      const overlapping = bookings.filter(
        (b) =>
          b.id !== excludeBookingId && bookingOverlapsRoom(b, room.id, checkIn, checkOut),
      );
      return { room, available: conflicts.length === 0, conflicts, overlapping };
    });
