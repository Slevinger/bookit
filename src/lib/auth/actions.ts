"use server";

import { signIn, signOut } from "./auth";

export async function loginWithGoogle(redirectTo = "/"): Promise<void> {
  await signIn("google", { redirectTo });
}

export async function logout(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
