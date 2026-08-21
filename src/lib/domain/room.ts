import { z } from "zod";
import { eachDateInRange } from "./dates";
import type { Beds, Guests, ISODate, Room, SeasonPricing } from "./types";

/** Adults covered by a room's base price when it hasn't been set explicitly. */
export const DEFAULT_INCLUDED_ADULTS = 2;

const seasonPricingSchema = z.object({
  basePrice: z.number().min(0, "Price cannot be negative"),
  weekendBasePrice: z.number().min(0, "Price cannot be negative").optional(),
  includedAdults: z.number().int().min(0, "Cannot be negative").default(DEFAULT_INCLUDED_ADULTS),
  extraAdultPrice: z.number().min(0, "Price cannot be negative").default(0),
  extraChildPrice: z.number().min(0, "Price cannot be negative").default(0),
});

export const roomDraftSchema = z.object({
  name: z.string().trim().min(1, "Room name is required"),
  description: z.string().default(""),
  beds: z
    .object({
      double: z.number().int().min(0, "Bed count cannot be negative"),
      single: z.number().int().min(0, "Bed count cannot be negative"),
    })
    .refine((beds) => beds.double + beds.single >= 1, "The room needs at least one bed"),
  basePrice: z.number().min(0, "Price cannot be negative"),
  weekendBasePrice: z.number().min(0, "Price cannot be negative").optional(),
  includedAdults: z.number().int().min(0, "Cannot be negative").default(DEFAULT_INCLUDED_ADULTS),
  extraAdultPrice: z.number().min(0, "Price cannot be negative").default(0),
  extraChildPrice: z.number().min(0, "Price cannot be negative").default(0),
  highSeason: seasonPricingSchema.optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export type RoomDraft = z.infer<typeof roomDraftSchema>;

/** A double bed sleeps two guests, a single sleeps one. */
export const roomCapacity = (beds: Beds): number => beds.double * 2 + beds.single;

/**
 * The room's low-season price set is stored directly on the room. This exposes
 * it as a `SeasonPricing` so both seasons share the same pricing math.
 */
export const lowSeasonPricing = (room: Room): SeasonPricing => ({
  basePrice: room.basePrice,
  weekendBasePrice: room.weekendBasePrice,
  includedAdults: room.includedAdults,
  extraAdultPrice: room.extraAdultPrice,
  extraChildPrice: room.extraChildPrice,
});

/** Picks the price set for the given season, falling back to low season. */
export const roomPricingForSeason = (room: Room, high: boolean): SeasonPricing =>
  high && room.highSeason ? room.highSeason : lowSeasonPricing(room);

/**
 * Nightly price for a party under a price set: the base price (the weekend base
 * on Fri/Sat when set, otherwise the midweek base) covering up to
 * `includedAdults`, plus a surcharge for each additional adult and every child.
 */
export const roomPricePerNight = (
  pricing: SeasonPricing,
  guests: Guests,
  weekend = false,
): number => {
  const base = weekend ? pricing.weekendBasePrice ?? pricing.basePrice : pricing.basePrice;
  const includedAdults = pricing.includedAdults ?? DEFAULT_INCLUDED_ADULTS;
  const extraAdults = Math.max(0, guests.adults - includedAdults);
  return (
    base +
    extraAdults * (pricing.extraAdultPrice ?? 0) +
    guests.children * (pricing.extraChildPrice ?? 0)
  );
};

/**
 * Whole-stay price for a party in a room, summed per night so a stay that
 * crosses seasons or weekends mixes the price sets correctly.
 */
export const roomStayPrice = (
  room: Room,
  guests: Guests,
  checkIn: ISODate,
  checkOut: ISODate,
  isHigh: (date: ISODate) => boolean,
  isWeekend: (date: ISODate) => boolean = () => false,
): number =>
  eachDateInRange(checkIn, checkOut).reduce(
    (sum, night) =>
      sum + roomPricePerNight(roomPricingForSeason(room, isHigh(night)), guests, isWeekend(night)),
    0,
  );

/**
 * One itemised line of a stay's price, grouping consecutive-or-not nights that
 * share the same season + day-type so the receipt reads "3 midweek low-season
 * nights" rather than a line per night. The per-night figure is broken down into
 * its base and per-guest surcharges so the reason for the price is explicit.
 */
export interface StayRateGroup {
  high: boolean;
  weekend: boolean;
  nights: number;
  /** Nightly base for this group (weekend base on Fri/Sat when set). */
  base: number;
  includedAdults: number;
  extraAdults: number;
  extraAdultPrice: number;
  children: number;
  extraChildPrice: number;
  /** Full nightly rate: base + surcharges. */
  perNight: number;
  /** perNight × nights. */
  subtotal: number;
}

/**
 * Breaks a stay into rate groups (one per distinct season + weekend combination
 * present in the range), in the order they first appear. The subtotals sum to
 * `roomStayPrice` for the same inputs.
 */
export const roomStayBreakdown = (
  room: Room,
  guests: Guests,
  checkIn: ISODate,
  checkOut: ISODate,
  isHigh: (date: ISODate) => boolean,
  isWeekend: (date: ISODate) => boolean = () => false,
): StayRateGroup[] => {
  const order: string[] = [];
  const groups = new Map<string, StayRateGroup>();
  for (const night of eachDateInRange(checkIn, checkOut)) {
    const high = isHigh(night);
    const weekend = isWeekend(night);
    const key = `${high}|${weekend}`;
    let group = groups.get(key);
    if (!group) {
      const pricing = roomPricingForSeason(room, high);
      const includedAdults = pricing.includedAdults ?? DEFAULT_INCLUDED_ADULTS;
      group = {
        high,
        weekend,
        nights: 0,
        base: weekend ? pricing.weekendBasePrice ?? pricing.basePrice : pricing.basePrice,
        includedAdults,
        extraAdults: Math.max(0, guests.adults - includedAdults),
        extraAdultPrice: pricing.extraAdultPrice ?? 0,
        children: guests.children,
        extraChildPrice: pricing.extraChildPrice ?? 0,
        perNight: roomPricePerNight(pricing, guests, weekend),
        subtotal: 0,
      };
      groups.set(key, group);
      order.push(key);
    }
    group.nights += 1;
    group.subtotal += group.perNight;
  }
  return order.map((k) => groups.get(k)!);
};
