"use client";

import { useTransition } from "react";
import { CalendarCheck, CalendarPlus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { loginWithGoogle } from "@/lib/auth/actions";
import { syncAllBookingsAction, type CalendarStatus } from "@/lib/google/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export function GoogleCalendarCard({ status }: { status: CalendarStatus }) {
  const { t } = useI18n();
  const [isSyncing, startSync] = useTransition();

  const handleSyncAll = () => {
    startSync(async () => {
      const result = await syncAllBookingsAction();
      if (result.ok) {
        toast.success(t("settings.calendar.syncDone", { n: result.synced }));
      } else if (result.error === "not-connected") {
        toast.error(t("settings.calendar.notConnected"));
      } else {
        toast.error(t("error.generic"));
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <CalendarCheck className="size-5" />
          {t("settings.calendar.title")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("settings.calendar.description")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={
              status.connected
                ? "inline-flex size-2.5 rounded-full bg-green-500"
                : "inline-flex size-2.5 rounded-full bg-muted-foreground/40"
            }
            aria-hidden="true"
          />
          <span className="font-medium">
            {status.connected
              ? t("settings.calendar.connected")
              : t("settings.calendar.disconnected")}
          </span>
        </div>

        {status.lastSyncAt ? (
          <p className="text-sm text-muted-foreground">
            {t("settings.calendar.lastSync", {
              when: new Date(status.lastSyncAt).toLocaleString(),
            })}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2.5">
          <form action={loginWithGoogle.bind(null, "/settings")}>
            <Button type="submit" variant={status.connected ? "outline" : "default"}>
              <CalendarPlus className="size-4" />
              {status.connected
                ? t("settings.calendar.reconnect")
                : t("settings.calendar.connect")}
            </Button>
          </form>

          {status.connected ? (
            <Button variant="outline" onClick={handleSyncAll} disabled={isSyncing}>
              <RefreshCw className={isSyncing ? "size-4 animate-spin" : "size-4"} />
              {isSyncing ? t("settings.calendar.syncing") : t("settings.calendar.syncAll")}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
