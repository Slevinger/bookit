import { bookingDraftSchema, withBedShortfallNote } from "@/lib/domain/booking";
import { computeAvailability } from "@/lib/domain/availability";
import type { Booking, BookingDraft, BookingRoom, ISODate, RoomAvailability } from "@/lib/domain/types";
import type { BookingRepository, RoomRepository } from "@/lib/repositories/types";
import { NotFoundError } from "@/lib/repositories/types";
import type { Emitter } from "@/lib/events/emitter";

export interface BookingServiceDeps {
  roomRepo: RoomRepository;
  bookingRepo: BookingRepository;
  emitter: Emitter;
}

export interface BookingService {
  createBooking(draft: BookingDraft): Promise<Booking>;
  updateBooking(id: string, draft: BookingDraft): Promise<Booking>;
  cancelBooking(id: string): Promise<Booking>;
  checkAvailability(
    checkIn: ISODate,
    checkOut: ISODate,
    excludeBookingId?: string,
  ): Promise<RoomAvailability[]>;
  listBookingsOverlapping(from: ISODate, to: ISODate): Promise<Booking[]>;
  listAllBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
}

export const createBookingService = ({
  roomRepo,
  bookingRepo,
  emitter,
}: BookingServiceDeps): BookingService => {
  const resolveRooms = async (bookingRooms: BookingRoom[]) => {
    const rooms = await Promise.all(bookingRooms.map((r) => roomRepo.get(r.roomId)));
    return rooms.filter((room) => room !== null);
  };

  return {
    async createBooking(draft) {
      const parsed = bookingDraftSchema.parse(draft);
      const rooms = await resolveRooms(parsed.rooms);
      const booking = await bookingRepo.createChecked({
        ...parsed,
        notes: withBedShortfallNote(parsed.notes, parsed.guests, rooms),
        status: parsed.status ?? "confirmed",
        source: parsed.source ?? "manual",
        createdAt: new Date().toISOString(),
      });
      await emitter.emit("booking.created", { booking });
      return booking;
    },

    async updateBooking(id, draft) {
      const previous = await bookingRepo.get(id);
      if (!previous) throw new NotFoundError("Booking", id);
      const parsed = bookingDraftSchema.parse(draft);
      const rooms = await resolveRooms(parsed.rooms);
      // A draft without notes means "keep the booking's existing notes".
      const baseNotes = draft.notes === undefined ? previous.notes : parsed.notes;
      const booking = await bookingRepo.updateChecked(id, {
        ...parsed,
        notes: withBedShortfallNote(baseNotes, parsed.guests, rooms),
      });
      await emitter.emit("booking.updated", { booking, previous });
      return booking;
    },

  async cancelBooking(id) {
    const booking = await bookingRepo.update(id, { status: "cancelled" });
    await emitter.emit("booking.cancelled", { booking });
    return booking;
  },

  async checkAvailability(checkIn, checkOut, excludeBookingId) {
    const [rooms, bookings] = await Promise.all([
      roomRepo.list(),
      bookingRepo.listOverlapping(checkIn, checkOut),
    ]);
    return computeAvailability(rooms, bookings, checkIn, checkOut, excludeBookingId);
  },

  async listBookingsOverlapping(from, to) {
    return bookingRepo.listOverlapping(from, to);
  },

  async listAllBookings() {
    return bookingRepo.list();
  },

  async getBooking(id) {
    return bookingRepo.get(id);
  },
  };
};
