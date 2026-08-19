"use server";

import { requireTenant } from "@/lib/auth/tenant";
import { getTenantContainer } from "@/lib/container";
import { getGoogleState } from "@/lib/google/token-store";
import { syncBookingToCalendar } from "@/lib/google/calendar-sync";

export interface CalendarStatus {
  /** True once the tenant has granted Calendar access (refresh token stored). */
  connected: boolean;
  /** True once the dedicated "BookIt Bookings" calendar has been created. */
  calendarReady: boolean;
  /** ISO timestamp of the last successful sync, if any. */
  lastSyncAt?: string;
}

export async function getCalendarStatusAction(): Promise<CalendarStatus> {
  const tenantId = await requireTenant();
  const state = await getGoogleState(tenantId);
  return {
    connected: Boolean(state.refreshToken),
    calendarReady: Boolean(state.calendarId),
    lastSyncAt: state.lastSyncAt,
  };
}

export type SyncAllResult =
  | { ok: true; synced: number }
  | { ok: false; error: "not-connected" | "failed" };

/**
 * Backfill: pushes every non-cancelled booking into the tenant's Google
 * Calendar. Idempotent — existing events are updated in place via the stored
 * booking -> event mapping.
 */
export async function syncAllBookingsAction(): Promise<SyncAllResult> {
  try {
    const tenantId = await requireTenant();
    const state = await getGoogleState(tenantId);
    if (!state.refreshToken) return { ok: false, error: "not-connected" };

    const { bookingService, roomService } = getTenantContainer(tenantId);
    const [bookings, rooms] = await Promise.all([
      bookingService.listAllBookings(),
      roomService.listRooms(),
    ]);
    const roomName = new Map(rooms.map((r) => [r.id, r.name]));

    let synced = 0;
    for (const booking of bookings) {
      if (booking.status === "cancelled") continue;
      const roomNames = booking.rooms.map((r) => roomName.get(r.roomId) ?? r.roomId);
      await syncBookingToCalendar(tenantId, booking, roomNames);
      synced += 1;
    }
    return { ok: true, synced };
  } catch (error) {
    console.error("[google] backfill failed:", error);
    return { ok: false, error: "failed" };
  }
}
