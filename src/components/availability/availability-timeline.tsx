"use client";

import { useMemo } from "react";
import { layoutRoomBars } from "@/lib/domain/calendar-layout";
import { addDays, eachDateInRange, nightsBetween } from "@/lib/domain/dates";
import type { ISODate, RoomAvailability } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CONTEXT_DAYS = 2;

export interface AvailabilityTimelineProps {
  result: RoomAvailability[];
  checkIn: ISODate;
  checkOut: ISODate;
  onBook: (roomIds: string[]) => void;
}

/**
 * Scheduling-assistant style view, laid out for phones: a shared date axis on
 * top, then one block per room — name and book button on a row, the full-width
 * timeline strip (proposed range as a band, conflicts as blocks) beneath it.
 */
export function AvailabilityTimeline({ result, checkIn, checkOut, onBook }: AvailabilityTimelineProps) {
  const { t, dateLocale, locale } = useI18n();
  const from = addDays(checkIn, -CONTEXT_DAYS);
  const to = addDays(checkOut, CONTEXT_DAYS);
  const days = useMemo(() => eachDateInRange(from, to), [from, to]);
  const proposedStart = nightsBetween(from, checkIn);
  const proposedSpan = nightsBetween(checkIn, checkOut);

  const gridTemplate = { gridTemplateColumns: `repeat(${days.length}, minmax(2.25rem, 1fr))` };
  const inProposedRange = (day: ISODate) => day >= checkIn && day < checkOut;

  return (
    // Always LTR: bar positioning is left-based and the date axis reads left-to-right.
    <div dir="ltr" className="grid gap-4">
      {/* Shared date axis */}
      <div className="grid" style={gridTemplate}>
        {days.map((day) => (
          <div
            key={day}
            className={cn(
              "text-center text-xs leading-tight text-muted-foreground",
              inProposedRange(day) && "font-bold text-primary",
            )}
          >
            <div>{new Date(day + "T00:00:00").toLocaleDateString(dateLocale, { weekday: "short" })}</div>
            <div className="text-sm font-semibold">{Number(day.slice(8, 10))}</div>
          </div>
        ))}
      </div>

      {result.map(({ room, available, overlapping }) => {
        const bars = layoutRoomBars(overlapping, room.id, from, to);
        return (
          <div key={room.id} data-testid={`row-${room.id}`} data-available={available} className="grid gap-1.5">
            {/* Room header follows the app's reading direction */}
            <div
              dir={locale === "he" ? "rtl" : "ltr"}
              className="flex items-center justify-between gap-3"
            >
              <span className="truncate text-base font-semibold">{room.name}</span>
              {available ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-4 text-base text-emerald-600 dark:text-emerald-400"
                  onClick={() => onBook([room.id])}
                >
                  {t("availability.book", { room: room.name })}
                </Button>
              ) : (
                <span className="text-sm font-medium text-muted-foreground">{t("availability.busy")}</span>
              )}
            </div>

            <div className="relative grid h-11 rounded-md bg-muted/40" style={gridTemplate}>
              {/* Proposed range band */}
              <div
                data-testid="proposed-band"
                className={cn(
                  "absolute inset-y-0 rounded-md border-2",
                  available ? "border-emerald-500 bg-emerald-500/15" : "border-destructive/60 bg-destructive/10",
                )}
                style={{
                  left: `${(proposedStart / days.length) * 100}%`,
                  width: `${(proposedSpan / days.length) * 100}%`,
                }}
              />
              {/* Existing bookings */}
              {bars.map((bar) => (
                <div
                  key={bar.booking.id}
                  data-testid={`conflict-${bar.booking.id}-${room.id}`}
                  title={`${bar.booking.contacts[0]?.name ?? ""} ${bar.booking.checkIn} → ${bar.booking.checkOut}`}
                  className={cn(
                    "absolute inset-y-1.5 z-10 flex items-center truncate rounded px-1.5 text-xs font-medium",
                    bar.booking.status === "tentative"
                      ? "border-2 border-dashed border-yellow-500 bg-yellow-400/30 text-yellow-900 dark:text-yellow-100"
                      : "bg-foreground/75 text-background",
                  )}
                  style={{
                    left: `${(bar.startIndex / days.length) * 100}%`,
                    width: `${(bar.span / days.length) * 100}%`,
                  }}
                >
                  {bar.booking.contacts[0]?.name}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
