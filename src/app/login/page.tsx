import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

/** Only same-origin absolute URLs or root-relative paths are honored. */
function safeRedirect(target: string | undefined): string | null {
  if (!target) return null;
  if (target.startsWith("/")) return target;
  try {
    const url = new URL(target);
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; callbackUrl?: string }>;
}) {
  // The proxy redirects unauthenticated users with `callbackUrl`; accept `from` too.
  const { from, callbackUrl } = await searchParams;
  const redirectTo = safeRedirect(callbackUrl) ?? safeRedirect(from) ?? "/calendar";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <header className="max-w-md space-y-3 text-center">
        <Image
          src="/logo.png"
          alt="BookIt"
          width={128}
          height={128}
          priority
          className="mx-auto size-32 object-contain"
        />
        <h1 className="sr-only">BookIt</h1>
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
        <LoginForm redirectTo={redirectTo} />
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
