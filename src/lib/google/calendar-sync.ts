import "server-only";
import type { calendar_v3 } from "googleapis";
import type { Booking } from "@/lib/domain/types";
import { createCalendarClient } from "./client";
import { CALENDAR_SUMMARY, bookingToEvent } from "./event-mapping";
import {
  deleteEventMapping,
  getEventId,
  getGoogleState,
  saveCalendarId,
  saveEventId,
  setLastSyncAt,
  type GoogleCalendarState,
} from "./token-store";

export { CALENDAR_SUMMARY, bookingToEvent };

/** Returns the calendar id, creating the dedicated calendar on first sync. */
const ensureCalendar = async (
  client: calendar_v3.Calendar,
  tenantId: string,
  state: GoogleCalendarState,
): Promise<string> => {
  if (state.calendarId) return state.calendarId;
  const res = await client.calendars.insert({ requestBody: { summary: CALENDAR_SUMMARY } });
  const calendarId = res.data.id;
  if (!calendarId) throw new Error("Google did not return a calendar id.");
  await saveCalendarId(tenantId, calendarId);
  return calendarId;
};

const isMissing = (error: unknown): boolean => {
  const status = (error as { code?: number; status?: number })?.code ??
    (error as { status?: number })?.status;
  return status === 404 || status === 410;
};

/**
 * Creates or updates the Google Calendar event for a booking. Cancelled bookings
 * are removed instead. No-ops when the tenant hasn't connected Google Calendar.
 */
export const syncBookingToCalendar = async (
  tenantId: string,
  booking: Booking,
  roomNames: string[] = [],
): Promise<void> => {
  const state = await getGoogleState(tenantId);
  if (!state.refreshToken) return;

  const client = createCalendarClient(state.refreshToken);

  if (booking.status === "cancelled") {
    await removeBookingFromCalendar(tenantId, booking.id, { client, state });
    return;
  }

  const calendarId = await ensureCalendar(client, tenantId, state);
  const requestBody = bookingToEvent(booking, roomNames);
  const existingEventId = await getEventId(tenantId, booking.id);

  if (existingEventId) {
    try {
      await client.events.update({ calendarId, eventId: existingEventId, requestBody });
    } catch (error) {
      // The event was removed in Google directly; recreate it.
      if (!isMissing(error)) throw error;
      const res = await client.events.insert({ calendarId, requestBody });
      if (res.data.id) await saveEventId(tenantId, booking.id, res.data.id);
    }
  } else {
    const res = await client.events.insert({ calendarId, requestBody });
    if (res.data.id) await saveEventId(tenantId, booking.id, res.data.id);
  }

  await setLastSyncAt(tenantId, new Date().toISOString());
};

/** Deletes the Google Calendar event for a booking and clears its mapping. */
export const removeBookingFromCalendar = async (
  tenantId: string,
  bookingId: string,
  preloaded?: { client: calendar_v3.Calendar; state: GoogleCalendarState },
): Promise<void> => {
  const state = preloaded?.state ?? (await getGoogleState(tenantId));
  if (!state.refreshToken || !state.calendarId) return;

  const eventId = await getEventId(tenantId, bookingId);
  if (!eventId) return;

  const client = preloaded?.client ?? createCalendarClient(state.refreshToken);
  try {
    await client.events.delete({ calendarId: state.calendarId, eventId });
  } catch (error) {
    // Already gone in Google — treat as success and drop the mapping.
    if (!isMissing(error)) throw error;
  }
  await deleteEventMapping(tenantId, bookingId);
};
