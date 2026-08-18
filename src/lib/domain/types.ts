/** Calendar date in YYYY-MM-DD format (no time component). */
export type ISODate = string;
export type DateString = ISODate;

export type BookingStatus = "confirmed" | "cancelled";
export type BookingSource = "manual" | "airbnb" | "booking.com" | "website";

export interface Beds {
  double: number;
  single: number;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  beds: Beds;
  basePrice: number;
  isActive: boolean;
  sortOrder: number;
  /** Reserved for future OTA/channel integrations (Airbnb, Booking.com ids, iCal urls). */
  externalRefs: Record<string, string>;
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
  /** Confirmed bookings overlapping the queried range, for timeline rendering. */
  conflicts: Booking[];
}

export interface Settings {
  businessName: string;
  currency: string;
  checkInTime: string;
  checkOutTime: string;
}
