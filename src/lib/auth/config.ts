import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe Auth.js configuration: providers and JWT callbacks only, with NO
 * Node-only dependencies (e.g. firebase-admin). This module is imported by the
 * proxy (edge runtime), so tenant provisioning lives in Node-only code instead
 * (see `tenant.ts`). The tenant id is the Google account id (`token.sub`).
 */
export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  // Cloud Run terminates TLS at a proxy; trust the forwarded host header.
  trustHost: true,
  pages: { signIn: "/login" },
  callbacks: {
    // Gate every matched route on an authenticated session; unauthenticated
    // users are redirected to the sign-in page.
    authorized: ({ auth }) => !!auth?.user,
    jwt: ({ token }) => token,
    session: ({ session, token }) => {
      if (token.sub) session.user.tenantId = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
