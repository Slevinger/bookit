import { nightsBetween, rangesOverlap } from "./dates";
import type { Booking, ISODate } from "./types";

export interface CalendarBar {
  booking: Booking;
  /** 0-based day index within the visible window where the bar starts. */
  startIndex: number;
  /** Number of day cells the bar covers (nights within the window). */
  span: number;
  clippedStart: boolean;
  clippedEnd: boolean;
}

/**
 * Computes positioned booking bars for one room row over a visible window
 * [from, to). Bars are clipped to the window and sorted by start.
 */
export function layoutRoomBars(
  bookings: Booking[],
  roomId: string,
  from: ISODate,
  to: ISODate,
): CalendarBar[] {
  return bookings
    .filter(
      (b) =>
        b.status !== "cancelled" &&
        b.rooms.some((r) => r.roomId === roomId) &&
        rangesOverlap(b.checkIn, b.checkOut, from, to),
    )
    .map((booking) => {
      const clippedStart = booking.checkIn < from;
      const clippedEnd = booking.checkOut > to;
      const visibleStart = clippedStart ? from : booking.checkIn;
      const visibleEnd = clippedEnd ? to : booking.checkOut;
      return {
        booking,
        startIndex: nightsBetween(from, visibleStart),
        span: nightsBetween(visibleStart, visibleEnd),
        clippedStart,
        clippedEnd,
      };
    })
    .sort((a, b) => a.startIndex - b.startIndex);
}
