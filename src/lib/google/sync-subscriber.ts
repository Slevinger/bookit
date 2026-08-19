import "server-only";
import type { Emitter } from "@/lib/events/emitter";
import type { Booking } from "@/lib/domain/types";
import type { RoomRepository } from "@/lib/repositories/types";
import { removeBookingFromCalendar, syncBookingToCalendar } from "./calendar-sync";

interface RegisterDeps {
  tenantId: string;
  emitter: Emitter;
  roomRepo: RoomRepository;
}

const resolveRoomNames = async (
  roomRepo: RoomRepository,
  booking: Booking,
): Promise<string[]> => {
  const rooms = await Promise.all(booking.rooms.map((r) => roomRepo.get(r.roomId)));
  return rooms.filter((room): room is NonNullable<typeof room> => room !== null).map((r) => r.name);
};

/**
 * Subscribes Google Calendar sync to a tenant's booking events. Handlers no-op
 * when the tenant hasn't connected Calendar, and the emitter isolates their
 * failures so sync problems never break booking writes.
 */
export const registerCalendarSync = ({ tenantId, emitter, roomRepo }: RegisterDeps): void => {
  const syncUpsert = async (booking: Booking) => {
    const roomNames = await resolveRoomNames(roomRepo, booking);
    await syncBookingToCalendar(tenantId, booking, roomNames);
  };

  emitter.on("booking.created", ({ booking }) => syncUpsert(booking));
  emitter.on("booking.updated", ({ booking }) => syncUpsert(booking));
  emitter.on("booking.cancelled", ({ booking }) =>
    removeBookingFromCalendar(tenantId, booking.id),
  );
};
