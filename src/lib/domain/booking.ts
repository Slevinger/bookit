import { z } from "zod";
import { isValidRange } from "./dates";
import { roomCapacity } from "./room";
import type { BookingNote, BookingRoom, Guests, Room } from "./types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const contactSchema = z.object({
  name: z.string().trim().min(1, "Contact name is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().optional(),
});

const bookingRoomSchema = z.object({
  roomId: z.string().min(1),
  price: z.number().min(0, "Price cannot be negative"),
});

export const bookingDraftSchema = z
  .object({
    rooms: z
      .array(bookingRoomSchema)
      .min(1, "Select at least one room")
      .refine(
        (rooms) => new Set(rooms.map((r) => r.roomId)).size === rooms.length,
        "Duplicate rooms in booking",
      ),
    guests: z.object({
      adults: z.number().int().min(1, "At least one adult is required"),
      children: z.number().int().min(0),
    }),
    contacts: z.array(contactSchema).min(1, "At least one contact is required"),
    checkIn: isoDate,
    checkOut: isoDate,
    notes: z
      .array(
        z.object({
          type: z.enum(["info", "notification", "action-item"]),
          text: z.string().trim().min(1, "Note text is required"),
          code: z.string().optional(),
          data: z.record(z.string(), z.number()).optional(),
        }),
      )
      .default([]),
    status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
    source: z.enum(["manual", "airbnb", "booking.com", "website"]).optional(),
  })
  .refine((d) => isValidRange(d.checkIn, d.checkOut), {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export type ValidatedBookingDraft = z.infer<typeof bookingDraftSchema>;

export const bookingTotal = (rooms: BookingRoom[]): number =>
  rooms.reduce((sum, r) => sum + r.price, 0);

export const totalGuests = (guests: Guests): number => guests.adults + guests.children;

/**
 * A booking covers the whole facility when it holds every active room (only
 * meaningful for multi-room properties). Used to present the booking as a
 * single "entire property" unit with one unified price instead of per-room lines.
 */
export const isEntireProperty = (bookingRoomIds: string[], rooms: Room[]): boolean => {
  const active = rooms.filter((r) => r.isActive);
  if (active.length < 2) return false;
  const booked = new Set(bookingRoomIds);
  return active.every((r) => booked.has(r.id));
};

export const BED_SHORTFALL_CODE = "bed-shortfall";

/**
 * When the selected rooms don't have enough beds for the party, produce an
 * action-item note so the shortage is visible on the booking and gets solved.
 */
export const bedShortfallNote = (guests: Guests, rooms: Room[]): BookingNote | null => {
  const sleeps = rooms.reduce((sum, room) => sum + roomCapacity(room.beds), 0);
  const party = totalGuests(guests);
  if (party <= sleeps) return null;
  return {
    type: "action-item",
    code: BED_SHORTFALL_CODE,
    data: { party, sleeps },
    text:
      `Not enough beds: ${party} guests but the selected room${rooms.length === 1 ? "" : "s"} ` +
      `sleep${rooms.length === 1 ? "s" : ""} only ${sleeps}. ` +
      "This is not ideal — find a good solution (extra bed, different room, or adjust the party).",
  };
};

/** Replaces any previous bed-shortfall note with the current assessment. */
export const withBedShortfallNote = (
  notes: BookingNote[],
  guests: Guests,
  rooms: Room[],
): BookingNote[] => {
  const kept = notes.filter((n) => n.code !== BED_SHORTFALL_CODE);
  const warning = bedShortfallNote(guests, rooms);
  return warning ? [...kept, warning] : kept;
};
