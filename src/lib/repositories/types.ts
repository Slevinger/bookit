import type { Booking, ISODate, Room, SeasonConfig, Tariff } from "@/lib/domain/types";

export interface RoomRepository {
  list(): Promise<Room[]>;
  get(id: string): Promise<Room | null>;
  create(room: Omit<Room, "id">): Promise<Room>;
  update(id: string, patch: Partial<Omit<Room, "id">>): Promise<Room>;
}

/** Singleton property-wide price list, stored per tenant. */
export interface TariffRepository {
  get(): Promise<Tariff | null>;
  set(tariff: Tariff): Promise<Tariff>;
}

/** Singleton high-season definition (holidays + manual ranges), per tenant. */
export interface SeasonRepository {
  get(): Promise<SeasonConfig | null>;
  set(config: SeasonConfig): Promise<SeasonConfig>;
}

export interface BookingRepository {
  list(): Promise<Booking[]>;
  get(id: string): Promise<Booking | null>;
  /** Confirmed or cancelled bookings overlapping [from, to). */
  listOverlapping(from: ISODate, to: ISODate): Promise<Booking[]>;
  /**
   * Atomically create the booking after re-checking that none of its rooms
   * have a conflicting confirmed booking. Throws BookingConflictError.
   */
  createChecked(booking: Omit<Booking, "id">, excludeBookingId?: string): Promise<Booking>;
  update(id: string, patch: Partial<Omit<Booking, "id">>): Promise<Booking>;
  /** Same conflict-checked semantics as createChecked but for date/room edits. */
  updateChecked(id: string, patch: Partial<Omit<Booking, "id">>): Promise<Booking>;
}

export class BookingConflictError extends Error {
  constructor(public readonly roomIds: string[]) {
    super(`Rooms unavailable for the selected dates: ${roomIds.join(", ")}`);
    this.name = "BookingConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = "NotFoundError";
  }
}
