import NextAuth from "next-auth";
import { authConfig } from "./config";

/**
 * Full Auth.js instance for Node runtime (route handler, server actions, pages).
 * Shares the edge-safe config with the proxy so sessions verify identically.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
