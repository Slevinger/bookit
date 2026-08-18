import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// Edge-safe instance (config has no Node-only deps). The `authorized` callback
// gates matched routes and redirects unauthenticated users to `/login`.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Protect everything except the login page, the Auth.js endpoints, and assets.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)).*)"],
};
