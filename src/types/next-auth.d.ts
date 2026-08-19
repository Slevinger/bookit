import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** Tenant id for data scoping (the Google account id, i.e. token.sub). */
      tenantId: string;
    } & DefaultSession["user"];
    /** Google OAuth access token for Calendar API calls (short-lived). */
    accessToken?: string;
    /** Google OAuth refresh token, captured on consent for background sync. */
    refreshToken?: string;
  }
}
