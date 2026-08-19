import "server-only";
import { google, type calendar_v3 } from "googleapis";

/**
 * Builds a Calendar API client authorized with the tenant's refresh token. The
 * OAuth2 client mints (and refreshes) short-lived access tokens on demand, so we
 * never store access tokens server-side. Reuses the same OAuth client id/secret
 * as the Auth.js Google provider.
 */
export const createCalendarClient = (refreshToken: string): calendar_v3.Calendar => {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET for Google Calendar sync.");
  }
  const auth = new google.auth.OAuth2({ clientId, clientSecret });
  auth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth });
};
