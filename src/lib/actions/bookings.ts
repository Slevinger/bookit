"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getContainer } from "@/lib/container";
import { BookingConflictError } from "@/lib/repositories/types";
import type { Booking, BookingDraft, ISODate, RoomAvailability } from "@/lib/domain/types";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function toError(error: unknown): string {
  if (error instanceof BookingConflictError) {
    return "Those dates are no longer available for the selected room(s).";
  }
  if (error instanceof ZodError) {
    return error.issues.map((i) => i.message).join(". ");
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/bookings");
}

export async function createBookingAction(draft: BookingDraft): Promise<ActionResult<Booking>> {
  try {
    const booking = await getContainer().bookingService.createBooking(draft);
    revalidateAll();
    return { ok: true, data: booking };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function updateBookingAction(
  id: string,
  draft: BookingDraft,
): Promise<ActionResult<Booking>> {
  try {
    const booking = await getContainer().bookingService.updateBooking(id, draft);
    revalidateAll();
    return { ok: true, data: booking };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function cancelBookingAction(id: string): Promise<ActionResult<Booking>> {
  try {
    const booking = await getContainer().bookingService.cancelBooking(id);
    revalidateAll();
    return { ok: true, data: booking };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function checkAvailabilityAction(
  checkIn: ISODate,
  checkOut: ISODate,
  excludeBookingId?: string,
): Promise<ActionResult<RoomAvailability[]>> {
  try {
    const result = await getContainer().bookingService.checkAvailability(
      checkIn,
      checkOut,
      excludeBookingId,
    );
    return { ok: true, data: result };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
