"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Pencil, Printer, Users, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cancelBookingAction, confirmBookingAction } from "@/lib/actions/bookings";
import { bookingTotal, isEntireProperty, totalGuests } from "@/lib/domain/booking";
import { formatMoney } from "@/lib/format";
import { layoutRoomBars } from "@/lib/domain/calendar-layout";
import { addDays, eachDateInRange, isWeekendDate, todayISO } from "@/lib/domain/dates";
import { isHighSeason } from "@/lib/domain/season";
import type { Booking, ISODate, Room, SeasonConfig } from "@/lib/domain/types";
import { useBookingDialog } from "@/components/booking/booking-dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const BAR_COLORS = [
  "bg-sky-600", "bg-emerald-600", "bg-amber-600", "bg-violet-600",
  "bg-rose-600", "bg-teal-600", "bg-indigo-600", "bg-orange-600",
];

// Tentative (not-yet-confirmed) bookings read as an "empty" hold: a dashed
// yellow outline with a faint yellow fill, so they look unconfirmed regardless
// of the booking id.
const TENTATIVE_BAR =
  "border-2 border-dashed border-yellow-500 bg-yellow-400/30 text-yellow-900 dark:text-yellow-100";

function barClasses(booking: Booking): string {
  if (booking.status === "tentative") return TENTATIVE_BAR;
  let hash = 0;
  for (const char of booking.id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return `${BAR_COLORS[Math.abs(hash) % BAR_COLORS.length]} text-white`;
}

export interface CalendarViewProps {
  rooms: Room[];
  bookings: Booking[];
  seasonConfig?: SeasonConfig | null;
  month: string; // YYYY-MM
  from: ISODate;
  to: ISODate;
}

export function CalendarView({ rooms, bookings, seasonConfig, month, from, to }: CalendarViewProps) {
  const { t, dateLocale } = useI18n();
  const { openNew } = useBookingDialog();
  const days = eachDateInRange(from, to);
  const today = todayISO();
  const activeRooms = rooms.filter((r) => r.isActive);
  const todayRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const isHigh = (day: ISODate) => isHighSeason(day, seasonConfig);
  const holidayTitle = (day: ISODate) =>
    seasonConfig?.holidays.find((h) => h.date === day)?.title;

  // On phones only a week or so fits; start the view at today instead of the 1st.
  useEffect(() => {
    todayRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [month]);

  // Rows grow so exactly 4 fill the visible area (with any extras scrolling).
  const MIN_ROW_HEIGHT = 64;
  const [rowHeight, setRowHeight] = useState(MIN_ROW_HEIGHT);
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const recompute = () => {
      const available = scroll.clientHeight - (headerRef.current?.offsetHeight ?? 0);
      setRowHeight(Math.max(MIN_ROW_HEIGHT, Math.floor(available / 4)));
    };
    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(scroll);
    if (headerRef.current) observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  const isWeekend = isWeekendDate;

  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Date(y, m - 1).toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
  const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  const currentMonth = today.slice(0, 7);

  const gridTemplate = { gridTemplateColumns: `repeat(${days.length}, minmax(3rem, 1fr))` };

  if (activeRooms.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-muted-foreground">{t("calendar.empty")}</p>
        <Button asChild>
          <Link href="/rooms">{t("calendar.addRooms")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Month navigation */}
      <div className="flex items-center gap-2.5">
        <Button variant="outline" size="icon-lg" className="size-11" asChild>
          <Link href={`/calendar?month=${prevMonth}`} aria-label={t("calendar.prevMonth")}>
            <ChevronLeft className="size-6 rtl:-scale-x-100" />
          </Link>
        </Button>
        <Button variant="outline" size="icon-lg" className="size-11" asChild>
          <Link href={`/calendar?month=${nextMonth}`} aria-label={t("calendar.nextMonth")}>
            <ChevronRight className="size-6 rtl:-scale-x-100" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">{monthLabel}</h1>
        {month !== currentMonth && (
          <Button variant="ghost" size="lg" className="text-base" asChild>
            <Link href="/calendar">{t("calendar.today")}</Link>
          </Button>
        )}
        <Button
          variant="outline"
          size="icon-lg"
          className="ms-auto size-11"
          asChild
        >
          <Link href={`/print/${month}`} target="_blank" aria-label={t("print.export")}>
            <Printer className="size-6" />
          </Link>
        </Button>
      </div>

      {/* Grid — always LTR: bar positioning is left-based and the date axis reads left-to-right.
          Fills the available height; room rows grow so 4 fill it, with extras scrolling
          vertically under the pinned header. */}
      <div ref={scrollRef} dir="ltr" className="min-h-0 flex-1 overflow-auto rounded-lg border">
        <div className="min-w-fit">
          {/* Day header — pinned to the top while the room rows scroll under it. */}
          <div ref={headerRef} className="sticky top-0 z-30 flex border-b bg-muted">
            <div className="sticky left-0 z-40 w-24 shrink-0 border-r bg-muted px-2 py-2 text-sm font-medium sm:w-36">
              {t("calendar.room")}
            </div>
            <div className="grid flex-1" style={gridTemplate}>
              {days.map((day) => (
                <div
                  key={day}
                  ref={day === today ? todayRef : undefined}
                  title={holidayTitle(day)}
                  className={cn(
                    "relative border-r py-1.5 text-center text-xs leading-tight text-muted-foreground last:border-r-0",
                    isWeekend(day) && "bg-muted",
                    isHigh(day) && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                    day < today && "bg-muted/80 opacity-45",
                    day === today && "bg-primary/15 font-bold text-primary",
                  )}
                >
                  <div>{new Date(day + "T00:00:00").toLocaleDateString(dateLocale, { weekday: "short" })}</div>
                  <div className="text-base font-semibold">{Number(day.slice(8, 10))}</div>
                  {holidayTitle(day) && (
                    <div className="truncate px-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      {holidayTitle(day)}
                    </div>
                  )}
                  {isHigh(day) && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500"
                    />
                  )}
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
                <div className="relative grid flex-1" style={{ ...gridTemplate, height: rowHeight }}>
                  {days.map((day) =>
                    day < today ? (
                      // Past days are grayed out and not bookable.
                      <div key={day} className="border-r bg-muted/60 opacity-45 last:border-r-0" />
                    ) : (
                      <button
                        key={day}
                        type="button"
                        aria-label={t("calendar.bookAria", { room: room.name, day })}
                        onClick={() => openNew({ checkIn: day, checkOut: addDays(day, 1), roomIds: [room.id] })}
                        className={cn(
                          "border-r transition-colors last:border-r-0 hover:bg-accent active:bg-accent",
                          isWeekend(day) && "bg-muted/40",
                          isHigh(day) && "bg-amber-500/10",
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <p>{t("calendar.hint")}</p>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-3 rounded-sm bg-amber-500/40 ring-1 ring-amber-500" />
          {t("calendar.highSeasonLegend")}
        </span>
      </div>
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
  const { t, tn, noteText, translateError } = useI18n();
  const contact = booking.contacts[0];

  async function handleCancel() {
    if (!confirm(t("booking.cancelConfirm", { name: contact?.name ?? "" }))) return;
    const result = await cancelBookingAction(booking.id);
    if (result.ok) {
      toast.success(t("booking.cancelled"));
      router.refresh();
    } else {
      toast.error(result.error ? translateError(result.error) : t("error.generic"));
    }
  }

  async function handleApprove() {
    const result = await confirmBookingAction(booking.id);
    if (result.ok) {
      toast.success(t("booking.confirmed"));
      router.refresh();
    } else {
      toast.error(result.error ? translateError(result.error) : t("error.generic"));
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "absolute inset-y-2 z-10 flex items-center gap-1.5 truncate px-2.5 text-sm font-medium shadow-sm transition-opacity hover:opacity-90",
            barClasses(booking),
            past && "opacity-50 saturate-50",
            clippedStart ? "rounded-l-none" : "rounded-l-md",
            clippedEnd ? "rounded-r-none" : "rounded-r-md",
          )}
          style={style}
        >
          {booking.status === "tentative" && <span aria-hidden className="text-xs">●</span>}
          {contact?.name}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-2 font-semibold">
            <span>{contact?.name}</span>
            {booking.status === "tentative" && (
              <span className="rounded bg-yellow-400 px-1.5 py-0.5 text-xs font-medium text-yellow-950">
                {t("booking.status.tentative")}
              </span>
            )}
          </div>
          <div className="text-muted-foreground" dir="ltr">
            {booking.checkIn} → {booking.checkOut}
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-muted-foreground" />
            {tn("calendar.adults", booking.guests.adults)}
            {booking.guests.children > 0 && `, ${tn("calendar.children", booking.guests.children)}`}
            <span className="text-muted-foreground">
              {t("calendar.totalGuests", { n: totalGuests(booking.guests) })}
            </span>
          </div>
          <div>
            {isEntireProperty(booking.rooms.map((br) => br.roomId), rooms) ? (
              <div className="flex justify-between font-medium">
                <span>{t("booking.entireProperty")}</span>
                <span className="tabular-nums">{formatMoney(bookingTotal(booking.rooms))}</span>
              </div>
            ) : (
              <>
                {booking.rooms.map((br) => (
                  <div key={br.roomId} className="flex justify-between">
                    <span>{rooms.find((r) => r.id === br.roomId)?.name ?? br.roomId}</span>
                    <span className="tabular-nums">{formatMoney(br.price)}</span>
                  </div>
                ))}
                {booking.rooms.length > 1 && (
                  <div className="mt-1 flex justify-between border-t pt-1 font-medium">
                    <span>{t("booking.summary.total")}</span>
                    <span className="tabular-nums">{formatMoney(bookingTotal(booking.rooms))}</span>
                  </div>
                )}
              </>
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
                  {note.type === "action-item" && t("booking.todo")}
                  {noteText(note)}
                </p>
              ))}
            </div>
          )}
          <Separator />
          {booking.status === "tentative" && (
            <Button
              size="sm"
              className="w-full bg-emerald-600 text-white hover:bg-emerald-600/90"
              onClick={handleApprove}
            >
              <CheckCircle2 className="size-3.5" /> {t("booking.approve")}
            </Button>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(booking)}>
              <Pencil className="size-3.5" /> {t("booking.edit")}
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={handleCancel}>
              <XCircle className="size-3.5" /> {t("booking.cancel")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
