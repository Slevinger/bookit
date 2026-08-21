/** Calendar date in YYYY-MM-DD format (no time component). */
export type ISODate = string;
export type DateString = ISODate;

export type BookingStatus = "confirmed" | "tentative" | "cancelled";
export type BookingSource = "manual" | "airbnb" | "booking.com" | "website";

export interface Beds {
  double: number;
  single: number;
}

export interface TariffCombination {
  adults: number;
  children: number;
  /** Price per night for this exact party (adults + children). */
  price: number;
}

/**
 * A price list keyed by party size. Pricing resolves an exact
 * (adults, children) `combination` first; otherwise it falls back to
 * `adults × adultPrice + children × childPrice`. All figures are per night.
 */
export interface Tariff {
  /** Fallback price per adult per night. */
  adultPrice: number;
  /** Fallback price per child per night. */
  childPrice: number;
  /** Exact-match overrides for specific parties. */
  combinations: TariffCombination[];
}

/** A nightly price set: base price plus per-adult/child surcharges. */
export interface SeasonPricing {
  /** Nightly midweek base price, covering up to `includedAdults` adults. */
  basePrice: number;
  /** Nightly weekend (Fri/Sat) base price; falls back to `basePrice` when unset. */
  weekendBasePrice?: number;
  /** Adults covered by the base price before per-adult surcharges apply (default 2). */
  includedAdults?: number;
  /** Nightly surcharge for each adult beyond `includedAdults`. */
  extraAdultPrice?: number;
  /** Nightly surcharge for each child. */
  extraChildPrice?: number;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  beds: Beds;
  /** Nightly midweek base price, covering up to `includedAdults` adults. Low season. */
  basePrice: number;
  /** Nightly weekend (Fri/Sat) base price; falls back to `basePrice` when unset. Low season. */
  weekendBasePrice?: number;
  /** Adults covered by the base price before per-adult surcharges apply (default 2). */
  includedAdults?: number;
  /** Nightly surcharge for each adult beyond `includedAdults`. */
  extraAdultPrice?: number;
  /** Nightly surcharge for each child. */
  extraChildPrice?: number;
  /** High-season price set; falls back to the low-season fields when unset. */
  highSeason?: SeasonPricing;
  isActive: boolean;
  sortOrder: number;
  /** Reserved for future OTA/channel integrations (Airbnb, Booking.com ids, iCal urls). */
  externalRefs: Record<string, string>;
}

/** A high-season date range (inclusive on both ends), managed by the owner. */
export interface HighSeasonRange {
  from: ISODate;
  to: ISODate;
  label?: string;
}

export interface Holiday {
  date: ISODate;
  title: string;
}

/**
 * Per-tenant definition of which dates are "high season": imported Israeli
 * holidays plus manually added ranges. `importedYears` tracks which calendar
 * years have already been pulled from Hebcal so refreshes are idempotent.
 */
export interface SeasonConfig {
  holidays: Holiday[];
  manualRanges: HighSeasonRange[];
  importedYears: number[];
}

export interface BookingRoom {
  roomId: string;
  /** Price agreed for this room for this booking (whole stay). */
  price: number;
}

export interface Contact {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface Guests {
  adults: number;
  children: number;
}

export type BookingNoteType = "info" | "notification" | "action-item";

export interface BookingNote {
  type: BookingNoteType;
  text: string;
  /** Machine tag for auto-generated notes so they can be refreshed on edit. */
  code?: string;
  /** Structured values behind auto-generated notes, so the UI can localize them. */
  data?: Record<string, number>;
}

export interface Booking {
  id: string;
  rooms: BookingRoom[];
  contacts: Contact[];
  guests: Guests;
  checkIn: ISODate;
  checkOut: ISODate;
  status: BookingStatus;
  notes: BookingNote[];
  source: BookingSource;
  createdAt: string;
}

export type BookingDraft = Omit<Booking, "id" | "createdAt" | "status" | "source" | "notes"> & {
  status?: BookingStatus;
  source?: BookingSource;
  notes?: BookingNote[];
};

export interface RoomAvailability {
  room: Room;
  available: boolean;
  /** Confirmed bookings overlapping the queried range — these block the room. */
  conflicts: Booking[];
  /**
   * All non-cancelled bookings overlapping the queried range (confirmed +
   * tentative), for timeline rendering. Tentative ones don't affect `available`.
   */
  overlapping: Booking[];
}

export interface Settings {
  businessName: string;
  currency: string;
  checkInTime: string;
  checkOutTime: string;
}
