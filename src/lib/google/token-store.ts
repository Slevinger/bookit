import "server-only";
import { getDb } from "@/lib/firestore/client";

const TENANTS = "tenants";
const CALENDAR_SYNC = "calendarSync";

/** Per-tenant Google Calendar connection state, stored on the tenant doc. */
export interface GoogleCalendarState {
  /** OAuth refresh token captured on consent; used to mint access tokens. */
  refreshToken?: string;
  /** Id of the dedicated "BookIt Bookings" calendar created in the account. */
  calendarId?: string;
  /** ISO timestamp of the last successful sync, for status display. */
  lastSyncAt?: string;
}

const tenantRef = (tenantId: string) => getDb().collection(TENANTS).doc(tenantId);

/**
 * Reads the tenant's Google Calendar state. Returns an empty object when the
 * tenant doc or the `googleCalendar` field is missing.
 */
export const getGoogleState = async (tenantId: string): Promise<GoogleCalendarState> => {
  const doc = await tenantRef(tenantId).get();
  const data = doc.data();
  return (data?.googleCalendar as GoogleCalendarState | undefined) ?? {};
};

/**
 * Persists the refresh token if it is new or changed. Skips the write when the
 * stored token already matches, so `requireTenant` stays cheap on every request.
 */
export const saveRefreshToken = async (tenantId: string, refreshToken: string): Promise<void> => {
  const state = await getGoogleState(tenantId);
  if (state.refreshToken === refreshToken) return;
  await tenantRef(tenantId).set(
    { googleCalendar: { ...state, refreshToken } },
    { merge: true },
  );
};

export const saveCalendarId = async (tenantId: string, calendarId: string): Promise<void> => {
  await tenantRef(tenantId).set({ googleCalendar: { calendarId } }, { merge: true });
};

export const setLastSyncAt = async (tenantId: string, iso: string): Promise<void> => {
  await tenantRef(tenantId).set({ googleCalendar: { lastSyncAt: iso } }, { merge: true });
};

/**
 * Booking -> Google event id mapping, kept in a `calendarSync` subcollection so
 * the `Booking` domain model stays free of integration concerns.
 */
export const getEventId = async (tenantId: string, bookingId: string): Promise<string | null> => {
  const doc = await tenantRef(tenantId).collection(CALENDAR_SYNC).doc(bookingId).get();
  return (doc.data()?.eventId as string | undefined) ?? null;
};

export const saveEventId = async (
  tenantId: string,
  bookingId: string,
  eventId: string,
): Promise<void> => {
  await tenantRef(tenantId).collection(CALENDAR_SYNC).doc(bookingId).set({ eventId });
};

export const deleteEventMapping = async (tenantId: string, bookingId: string): Promise<void> => {
  await tenantRef(tenantId).collection(CALENDAR_SYNC).doc(bookingId).delete();
};
