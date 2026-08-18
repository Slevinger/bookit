import { z } from "zod";
import type { Beds } from "./types";

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
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export type RoomDraft = z.infer<typeof roomDraftSchema>;

/** A double bed sleeps two guests, a single sleeps one. */
export const roomCapacity = (beds: Beds): number => beds.double * 2 + beds.single;
