"use client";

import { loginAsDevUser, loginWithGoogle } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

export function LoginForm({
  redirectTo,
  showDevLogin = false,
}: {
  redirectTo: string;
  showDevLogin?: boolean;
}) {
  const { t } = useI18n();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("login.tagline")}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t("login.purpose")}</p>
      </CardHeader>
      <CardContent>
        <form action={loginWithGoogle.bind(null, redirectTo)}>
          <Button type="submit" size="lg" className="h-13 w-full text-base">
            <GoogleMark />
            {t("login.google")}
          </Button>
        </form>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t("login.calendarNote")}
        </p>

        {showDevLogin && (
          <form action={loginAsDevUser} className="mt-6 grid gap-2 border-t pt-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <p className="text-xs font-medium text-muted-foreground">{t("login.devTitle")}</p>
            <Input
              name="userId"
              autoComplete="off"
              placeholder={t("login.devPlaceholder")}
              className="h-12 text-base"
              dir="ltr"
            />
            <Button type="submit" variant="outline" size="lg" className="h-12 w-full text-base">
              {t("login.devSubmit")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("login.devHint")}</p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function GoogleMark() {
  return (
    <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
