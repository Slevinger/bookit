"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cancelBookingAction } from "@/lib/actions/bookings";
import { bookingTotal, totalGuests } from "@/lib/domain/booking";
import { layoutRoomBars } from "@/lib/domain/calendar-layout";
import { addDays, eachDateInRange, todayISO } from "@/lib/domain/dates";
import type { Booking, ISODate, Room } from "@/lib/domain/types";
import { useBookingDialog } from "@/components/booking/booking-dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const BAR_COLORS = [
  "bg-sky-600", "bg-emerald-600", "bg-amber-600", "bg-violet-600",
  "bg-rose-600", "bg-teal-600", "bg-indigo-600", "bg-orange-600",
];

function barColor(bookingId: string): string {
  let hash = 0;
  for (const char of bookingId) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return BAR_COLORS[Math.abs(hash) % BAR_COLORS.length];
}

export interface CalendarViewProps {
  rooms: Room[];
  bookings: Booking[];
  month: string; // YYYY-MM
  from: ISODate;
  to: ISODate;
}

export function CalendarView({ rooms, bookings, month, from, to }: CalendarViewProps) {
  const { openNew } = useBookingDialog();
  const days = eachDateInRange(from, to);
  const today = todayISO();
  const activeRooms = rooms.filter((r) => r.isActive);
  const todayRef = useRef<HTMLDivElement>(null);

  // On phones only a week or so fits; start the view at today instead of the 1st.
  useEffect(() => {
    todayRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [month]);

  const isWeekend = (day: ISODate) => {
    const dow = new Date(day + "T00:00:00").getDay();
    return dow === 5 || dow === 6; // Fri + Sat
  };

  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Date(y, m - 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const currentMonth = today.slice(0, 7);

  const gridTemplate = { gridTemplateColumns: `repeat(${days.length}, minmax(3rem, 1fr))` };

  if (activeRooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-muted-foreground">No rooms yet. Add your rooms to start booking.</p>
        <Button asChild>
          <Link href="/rooms">Add rooms</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {/* Month navigation */}
      <div className="flex items-center gap-2.5">
        <Button variant="outline" size="icon-lg" className="size-11" asChild>
          <Link href={`/?month=${prevMonth}`} aria-label="Previous month"><ChevronLeft className="size-6" /></Link>
        </Button>
        <Button variant="outline" size="icon-lg" className="size-11" asChild>
          <Link href={`/?month=${nextMonth}`} aria-label="Next month"><ChevronRight className="size-6" /></Link>
        </Button>
        <h1 className="text-xl font-bold">{monthLabel}</h1>
        {month !== currentMonth && (
          <Button variant="ghost" size="lg" className="text-base" asChild>
            <Link href="/">Today</Link>
          </Button>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-lg border">
        <div className="min-w-fit">
          {/* Day header */}
          <div className="flex border-b bg-muted/50">
            <div className="sticky left-0 z-20 w-24 shrink-0 border-r bg-muted px-2 py-2 text-sm font-medium sm:w-36">
              Room
            </div>
            <div className="grid flex-1" style={gridTemplate}>
              {days.map((day) => (
                <div
                  key={day}
                  ref={day === today ? todayRef : undefined}
                  className={cn(
                    "border-r py-1.5 text-center text-xs leading-tight text-muted-foreground last:border-r-0",
                    isWeekend(day) && "bg-muted",
                    day < today && "bg-muted/80 opacity-45",
                    day === today && "bg-primary/15 font-bold text-primary",
                  )}
                >
                  <div>{new Date(day + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" })}</div>
                  <div className="text-base font-semibold">{Number(day.slice(8, 10))}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Room rows */}
          {activeRooms.map((room) => {
            const bars = layoutRoomBars(bookings, room.id, from, to);
            return (
              <div key={room.id} className="flex border-b last:border-b-0">
                <div className="sticky left-0 z-20 flex w-24 shrink-0 items-center border-r bg-background px-2 py-1 sm:w-36">
                  <span className="truncate text-base font-medium">{room.name}</span>
                </div>
                <div className="relative grid h-16 flex-1" style={gridTemplate}>
                  {days.map((day) =>
                    day < today ? (
                      // Past days are grayed out and not bookable.
                      <div key={day} className="border-r bg-muted/60 opacity-45 last:border-r-0" />
                    ) : (
                      <button
                        key={day}
                        type="button"
                        aria-label={`Book ${room.name} on ${day}`}
                        onClick={() => openNew({ checkIn: day, checkOut: addDays(day, 1), roomIds: [room.id] })}
                        className={cn(
                          "border-r transition-colors last:border-r-0 hover:bg-accent active:bg-accent",
                          isWeekend(day) && "bg-muted/40",
                          day === today && "bg-primary/10",
                        )}
                      />
                    ),
                  )}
                  {bars.map((bar) => (
                    <BookingBar
                      key={bar.booking.id}
                      booking={bar.booking}
                      past={bar.booking.checkOut <= today}
                      rooms={rooms}
                      style={{
                        left: `calc(${(bar.startIndex / days.length) * 100}% + 2px)`,
                        width: `calc(${(bar.span / days.length) * 100}% - 4px)`,
                      }}
                      clippedStart={bar.clippedStart}
                      clippedEnd={bar.clippedEnd}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Tap an empty day to add a booking. Tap a booking for details.</p>
    </div>
  );
}

function BookingBar({
  booking,
  rooms,
  style,
  clippedStart,
  clippedEnd,
  past = false,
}: {
  booking: Booking;
  rooms: Room[];
  style: React.CSSProperties;
  clippedStart: boolean;
  clippedEnd: boolean;
  past?: boolean;
}) {
  const router = useRouter();
  const { openEdit } = useBookingDialog();
  const contact = booking.contacts[0];

  async function handleCancel() {
    if (!confirm(`Cancel booking for ${contact?.name}?`)) return;
    const result = await cancelBookingAction(booking.id);
    if (result.ok) {
      toast.success("Booking cancelled");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "absolute inset-y-2 z-10 flex items-center truncate px-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90",
            barColor(booking.id),
            past && "opacity-50 saturate-50",
            clippedStart ? "rounded-l-none" : "rounded-l-md",
            clippedEnd ? "rounded-r-none" : "rounded-r-md",
          )}
          style={style}
        >
          {contact?.name}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="grid gap-2 text-sm">
          <div className="font-semibold">{contact?.name}</div>
          <div className="text-muted-foreground">
            {booking.checkIn} → {booking.checkOut}
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-muted-foreground" />
            {booking.guests.adults} adult{booking.guests.adults === 1 ? "" : "s"}
            {booking.guests.children > 0 && `, ${booking.guests.children} child${booking.guests.children === 1 ? "" : "ren"}`}
            <span className="text-muted-foreground">({totalGuests(booking.guests)} total)</span>
          </div>
          <div>
            {booking.rooms.map((br) => (
              <div key={br.roomId} className="flex justify-between">
                <span>{rooms.find((r) => r.id === br.roomId)?.name ?? br.roomId}</span>
                <span className="tabular-nums">{br.price.toLocaleString()}</span>
              </div>
            ))}
            {booking.rooms.length > 1 && (
              <div className="mt-1 flex justify-between border-t pt-1 font-medium">
                <span>Total</span>
                <span className="tabular-nums">{bookingTotal(booking.rooms).toLocaleString()}</span>
              </div>
            )}
          </div>
          {contact?.phone && (
            <a href={`tel:${contact.phone}`} className="text-primary underline-offset-2 hover:underline">
              {contact.phone}
            </a>
          )}
          {booking.notes.length > 0 && (
            <div className="grid gap-1.5">
              {booking.notes.map((note, i) => (
                <p
                  key={i}
                  className={cn(
                    "rounded-md px-2.5 py-1.5",
                    note.type === "info" && "bg-muted text-muted-foreground",
                    note.type === "notification" &&
                      "bg-amber-500/10 font-medium text-amber-600 dark:text-amber-400",
                    note.type === "action-item" &&
                      "bg-destructive/10 font-medium text-destructive",
                  )}
                >
                  {note.type === "action-item" && "To do: "}
                  {note.text}
                </p>
              ))}
            </div>
          )}
          <Separator />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(booking)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={handleCancel}>
              <XCircle className="size-3.5" /> Cancel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
