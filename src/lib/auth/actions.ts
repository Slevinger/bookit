"use server";

import { signIn, signOut } from "./auth";
import { DEV_LOGIN_ENABLED, DEV_PROVIDER_ID } from "./config";

export async function loginWithGoogle(redirectTo = "/calendar"): Promise<void> {
  await signIn("google", { redirectTo });
}

/** Dev-only: sign in as an arbitrary user id (used as the tenant id). */
export async function loginAsDevUser(formData: FormData): Promise<void> {
  if (!DEV_LOGIN_ENABLED) throw new Error("Dev login is disabled");
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return;
  const redirectTo = String(formData.get("redirectTo") || "/calendar");
  await signIn(DEV_PROVIDER_ID, { userId, redirectTo });
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
