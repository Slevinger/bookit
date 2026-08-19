import { Suspense } from "react";
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
  const redirectTo = safeRedirect(callbackUrl) ?? safeRedirect(from) ?? "/";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
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
