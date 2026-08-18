"use client";

import { useMemo } from "react";
import { layoutRoomBars } from "@/lib/domain/calendar-layout";
import { addDays, eachDateInRange, nightsBetween } from "@/lib/domain/dates";
import type { ISODate, RoomAvailability } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONTEXT_DAYS = 2;

export interface AvailabilityTimelineProps {
  result: RoomAvailability[];
  checkIn: ISODate;
  checkOut: ISODate;
  onBook: (roomIds: string[]) => void;
}

/**
 * Scheduling-assistant style view: each room on a row along a shared date
 * axis, the proposed range highlighted as a band, conflicts as blocks.
 */
export function AvailabilityTimeline({ result, checkIn, checkOut, onBook }: AvailabilityTimelineProps) {
  const from = addDays(checkIn, -CONTEXT_DAYS);
  const to = addDays(checkOut, CONTEXT_DAYS);
  const days = useMemo(() => eachDateInRange(from, to), [from, to]);
  const proposedStart = nightsBetween(from, checkIn);
  const proposedSpan = nightsBetween(checkIn, checkOut);

  const gridTemplate = { gridTemplateColumns: `repeat(${days.length}, minmax(2rem, 1fr))` };

  return (
    <div className="grid gap-1 overflow-x-auto">
      {/* Date axis */}
      <div className="grid pl-28" style={gridTemplate}>
        {days.map((day) => (
          <div key={day} className="text-center text-[10px] text-muted-foreground">
            <div>{new Date(day + "T00:00:00").toLocaleDateString(undefined, { weekday: "narrow" })}</div>
            <div className="font-medium">{Number(day.slice(8, 10))}</div>
          </div>
        ))}
      </div>

      {result.map(({ room, available, conflicts }) => {
        const bars = layoutRoomBars(conflicts, room.id, from, to);
        return (
          <div
            key={room.id}
            data-testid={`row-${room.id}`}
            data-available={available}
            className="flex items-center gap-2"
          >
            <div className="w-26 shrink-0 truncate text-sm font-medium">{room.name}</div>
            <div className="relative grid h-9 flex-1 rounded-md bg-muted/40" style={gridTemplate}>
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
                  title={`${bar.booking.contacts[0]?.name ?? "Booking"} ${bar.booking.checkIn} → ${bar.booking.checkOut}`}
                  className="absolute inset-y-1.5 z-10 flex items-center truncate rounded bg-foreground/75 px-1.5 text-[10px] font-medium text-background"
                  style={{
                    left: `${(bar.startIndex / days.length) * 100}%`,
                    width: `${(bar.span / days.length) * 100}%`,
                  }}
                >
                  {bar.booking.contacts[0]?.name}
                </div>
              ))}
            </div>
            <div className="w-24 shrink-0 text-right">
              {available ? (
                <Button size="sm" variant="outline" className="h-7 text-emerald-700" onClick={() => onBook([room.id])}>
                  Book {room.name}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Busy</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
