import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

/** Dev-only sign-in: any user id becomes the tenant id, so you can switch
 * between isolated accounts locally without Google OAuth. Never enabled in
 * production. */
export const DEV_LOGIN_ENABLED = process.env.NODE_ENV !== "production";
export const DEV_PROVIDER_ID = "dev";

/**
 * Google OAuth scopes, kept to the minimum:
 * - `openid`: the stable account id used as the tenant id (required to sign in).
 * - `email`: stored on the tenant record.
 * - calendar: create a dedicated calendar and sync bookings into it.
 * `profile` (name/photo) is intentionally omitted since it isn't used anywhere.
 * `access_type=offline` + `prompt=consent` are required to receive a refresh
 * token (otherwise Google only returns one on the very first consent).
 */
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar",
].join(" ");

/**
 * Edge-safe Auth.js configuration: providers and JWT callbacks only, with NO
 * Node-only dependencies (e.g. firebase-admin). This module is imported by the
 * proxy (edge runtime), so tenant provisioning lives in Node-only code instead
 * (see `tenant.ts`). The tenant id is the Google account id (`token.sub`).
 */
export const authConfig = {
  providers: [
    Google({
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    ...(DEV_LOGIN_ENABLED
      ? [
          Credentials({
            id: DEV_PROVIDER_ID,
            name: "Local dev user",
            credentials: { userId: { label: "User id", type: "text" } },
            authorize: (creds) => {
              const userId = typeof creds?.userId === "string" ? creds.userId.trim() : "";
              if (!userId) return null;
              return { id: userId, email: `${userId}@local`, name: userId };
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  // Cloud Run terminates TLS at a proxy; trust the forwarded host header.
  trustHost: true,
  pages: { signIn: "/login" },
  callbacks: {
    // Gate every matched route on an authenticated session; unauthenticated
    // users are redirected to the sign-in page.
    authorized: ({ auth }) => !!auth?.user,
    // On the initial sign-in `account` carries the OAuth tokens and the stable
    // Google account id. Persist them on the JWT so (a) the tenant id stays
    // constant across logins and (b) the refresh token can later be saved to
    // Firestore (in Node) for background calendar sync. Google only returns a
    // refresh token on consent, so keep any previously stored one when a later
    // `account` lacks it.
    jwt: ({ token, account, user }) => {
      if (account) {
        if (account.provider === DEV_PROVIDER_ID) {
          // Local dev sign-in: the entered user id is the tenant id.
          token.googleId = user?.id ?? account.providerAccountId ?? token.sub;
        } else {
          // `providerAccountId` is Google's stable numeric user id. Using it as
          // the tenant id avoids the random `crypto.randomUUID()` that Auth.js
          // assigns to `token.sub` when there is no database adapter (which would
          // otherwise create a brand-new empty tenant on every sign-in).
          if (account.providerAccountId) token.googleId = account.providerAccountId;
          token.accessToken = account.access_token;
          token.expiresAt = account.expires_at;
          if (account.refresh_token) token.refreshToken = account.refresh_token;
        }
      }
      return token;
    },
    session: ({ session, token }) => {
      // The JWT carries an `unknown` index signature, so narrow custom fields.
      const tenantId = (token.googleId as string | undefined) ?? token.sub;
      if (tenantId) session.user.tenantId = tenantId;
      session.accessToken = token.accessToken as string | undefined;
      session.refreshToken = token.refreshToken as string | undefined;
      return session;
    },
  },
} satisfies NextAuthConfig;
