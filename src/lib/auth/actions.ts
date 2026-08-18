"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, isCorrectPassword, sessionCookieName } from "./session";

export interface LoginState {
  error?: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = formData.get("password");

  if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET) {
    return { error: "Server is not configured (APP_PASSWORD / SESSION_SECRET missing)." };
  }
  if (typeof password !== "string" || !isCorrectPassword(password)) {
    return { error: "Incorrect password." };
  }

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  const from = formData.get("from");
  redirect(typeof from === "string" && from.startsWith("/") ? from : "/");
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
  redirect("/login");
}
