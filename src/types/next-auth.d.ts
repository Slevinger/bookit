import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** Tenant id for data scoping (the Google account id, i.e. token.sub). */
      tenantId: string;
    } & DefaultSession["user"];
  }
}
