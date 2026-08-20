import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

/**
 * Public landing page served at the apex domain. It must render without login
 * and describe the app's purpose and Google data usage — this is the URL
 * submitted as the OAuth "Application home page" for verification. Signed-in
 * users are forwarded to the calendar dashboard.
 */
export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/calendar");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <header className="max-w-md space-y-3 text-center">
        <h1 className="text-3xl font-bold">BookIt</h1>
        <p className="text-sm text-muted-foreground">
          BookIt is a booking management app for bed &amp; breakfasts,
          guesthouses and vacation rentals. Owners manage rooms, reservations
          and availability in one place, and can sync their bookings to a
          dedicated Google Calendar.
        </p>
        <p className="text-xs text-muted-foreground">
          When you sign in with Google, BookIt requests permission to manage
          your Google Calendar. We use this access solely to create and update
          calendar events that mirror your BookIt bookings. Sync is one-way
          (BookIt to Google Calendar), and we never sell or share your data with
          third parties. See our{" "}
          <Link className="underline" href="/privacy">
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
      </header>
      <Suspense>
        <LoginForm redirectTo="/calendar" />
      </Suspense>
      <nav className="text-center text-xs text-muted-foreground">
        <Link className="underline" href="/privacy">
          Privacy Policy
        </Link>
        <span className="px-2">·</span>
        <Link className="underline" href="/terms">
          Terms of Service
        </Link>
      </nav>
    </main>
  );
}
