import { z } from "zod";
import type { Guests, Tariff } from "./types";

export const tariffCombinationSchema = z.object({
  adults: z.number().int().min(0, "Adults cannot be negative"),
  children: z.number().int().min(0, "Children cannot be negative"),
  price: z.number().min(0, "Price cannot be negative"),
});

export const tariffSchema = z.object({
  adultPrice: z.number().min(0, "Price cannot be negative"),
  childPrice: z.number().min(0, "Price cannot be negative"),
  combinations: z
    .array(tariffCombinationSchema)
    .default([])
    .refine(
      (rows) => new Set(rows.map((r) => `${r.adults}-${r.children}`)).size === rows.length,
      "Duplicate combinations in tariff",
    ),
});

export type TariffInput = z.input<typeof tariffSchema>;

export const emptyTariff = (): Tariff => ({ adultPrice: 0, childPrice: 0, combinations: [] });

/** A tariff only affects pricing once at least one figure has been set. */
export const hasTariff = (tariff?: Tariff | null): tariff is Tariff =>
  !!tariff &&
  (tariff.adultPrice > 0 || tariff.childPrice > 0 || tariff.combinations.length > 0);

/**
 * Price per night for a party. An exact (adults, children) combination wins;
 * otherwise fall back to `adults × adultPrice + children × childPrice`.
 */
export const tariffPricePerNight = (tariff: Tariff, guests: Guests): number => {
  const combo = tariff.combinations.find(
    (c) => c.adults === guests.adults && c.children === guests.children,
  );
  if (combo) return combo.price;
  return guests.adults * tariff.adultPrice + guests.children * tariff.childPrice;
};

/** Whole-stay price for a party under a tariff (per-night price × nights). */
export const tariffStayPrice = (tariff: Tariff, guests: Guests, nights: number): number =>
  tariffPricePerNight(tariff, guests) * Math.max(nights, 1);
