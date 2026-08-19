import type { calendar_v3 } from "googleapis";
import type { Booking } from "@/lib/domain/types";

/** Title of the dedicated calendar we create in the user's Google account. */
export const CALENDAR_SUMMARY = "BookIt Bookings";

/**
 * Maps a booking to a Google Calendar all-day event. Pure and side-effect free
 * so it can be unit-tested. Google treats `end.date` as exclusive, which matches
 * a hotel checkout date exactly (the guest leaves on the checkout day).
 */
export function bookingToEvent(
  booking: Booking,
  roomNames: string[] = [],
): calendar_v3.Schema$Event {
  const guestName = booking.contacts[0]?.name?.trim() || "Guest";
  const rooms = roomNames.length ? roomNames : booking.rooms.map((r) => r.roomId);
  const summary = rooms.length ? `${guestName} — ${rooms.join(", ")}` : guestName;

  const totalGuests = booking.guests.adults + booking.guests.children;
  const descriptionLines = [
    `Guests: ${totalGuests} (${booking.guests.adults} adults, ${booking.guests.children} children)`,
  ];
  const phone = booking.contacts[0]?.phone?.trim();
  if (phone) descriptionLines.push(`Phone: ${phone}`);
  for (const note of booking.notes) descriptionLines.push(note.text);
  descriptionLines.push(`Status: ${booking.status}`);
  descriptionLines.push("Synced from BookIt");

  return {
    summary,
    description: descriptionLines.join("\n"),
    start: { date: booking.checkIn },
    end: { date: booking.checkOut },
    extendedProperties: { private: { bookitBookingId: booking.id } },
  };
}
