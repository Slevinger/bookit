"use client";

import Link from "next/link";
import { ArrowRight, Mail, Printer } from "lucide-react";
import type { Booking, Room } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export interface PrintActionsProps {
  month: string;
  monthLabel: string;
  bookings: Booking[];
  rooms: Room[];
}

/** Toolbar above the printable sheet; hidden on the printed page itself. */
export function PrintActions({ month, monthLabel, bookings, rooms }: PrintActionsProps) {
  const { t } = useI18n();

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;
  const lines = bookings
    .slice()
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))
    .map((b) => {
      const contact = b.contacts[0];
      const roomList = b.rooms.map((r) => roomName(r.roomId)).join(", ");
      return `${b.checkIn} → ${b.checkOut} · ${roomList} · ${contact?.name ?? ""} · ${contact?.phone ?? ""}`;
    });
  const mailto =
    `mailto:?subject=${encodeURIComponent(t("print.emailSubject", { month: monthLabel }))}` +
    `&body=${encodeURIComponent(`${t("print.emailIntro", { month: monthLabel })}\n\n${lines.join("\n")}`)}`;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
      <Button variant="ghost" size="sm" asChild className="text-neutral-600">
        <Link href={`/?month=${month}`}>
          <ArrowRight className="size-4 ltr:-scale-x-100" />
          {t("print.backToCalendar")}
        </Link>
      </Button>
      <div className="ms-auto flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={mailto}>
            <Mail className="size-4" />
            {t("print.email")}
          </a>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-4" />
          {t("print.print")}
        </Button>
      </div>
      <p className="w-full text-xs text-neutral-500">{t("print.emailHint")}</p>
    </div>
  );
}
