import { Suspense } from "react";
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
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Suspense>
        <LoginForm redirectTo={redirectTo} />
      </Suspense>
    </main>
  );
}
