"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { confirmBookingAction } from "@/lib/actions/bookings";
import { bookingTotal, isEntireProperty, totalGuests } from "@/lib/domain/booking";
import { formatMoney } from "@/lib/format";
import { todayISO } from "@/lib/domain/dates";
import type { Booking, Room } from "@/lib/domain/types";
import { useBookingDialog } from "@/components/booking/booking-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function BookingsList({ bookings, rooms }: { bookings: Booking[]; rooms: Room[] }) {
  const { t, translateError } = useI18n();
  const { openEdit } = useBookingDialog();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showPast, setShowPast] = useState(false);
  const today = todayISO();

  async function handleApprove(id: string) {
    const result = await confirmBookingAction(id);
    if (result.ok) {
      toast.success(t("booking.confirmed"));
      router.refresh();
    } else {
      toast.error(result.error ? translateError(result.error) : t("error.generic"));
    }
  }

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;

  const roomsLabel = (booking: Booking) =>
    isEntireProperty(booking.rooms.map((r) => r.roomId), rooms)
      ? t("booking.entireProperty")
      : booking.rooms.map((r) => roomName(r.roomId)).join(", ");

  const statusBadge = (booking: Booking) =>
    booking.status === "tentative" ? (
      <Badge className="bg-yellow-400 text-yellow-950 hover:bg-yellow-400">
        {t("booking.status.tentative")}
      </Badge>
    ) : (
      <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
        {booking.status === "confirmed"
          ? t("booking.status.confirmed")
          : t("booking.status.cancelled")}
      </Badge>
    );

  const rowActions = (booking: Booking) => (
    <div className="flex items-center justify-end gap-2">
      {booking.status === "tentative" && (
        <Button
          size="sm"
          className="bg-emerald-600 text-white shadow-sm hover:bg-emerald-600/90"
          onClick={() => handleApprove(booking.id)}
        >
          <CheckCircle2 className="size-4" /> {t("booking.approve")}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("list.editAria")}
        onClick={() => openEdit(booking)}
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings
      .filter((b) => showPast || b.checkOut >= today)
      .filter(
        (b) =>
          !q ||
          b.contacts.some(
            (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q),
          ) ||
          b.rooms.some((r) => roomName(r.roomId).toLowerCase().includes(q)),
      )
      .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, query, showPast, today]);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">{t("list.title")}</h1>
        <div className="relative ms-auto w-full sm:w-64">
          <Search className="absolute start-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={t("list.search")}
            className="ps-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPast((v) => !v)}>
          {showPast ? t("list.hidePast") : t("list.showPast")}
        </Button>
      </div>

      {filtered.length === 0 && (
        <p className="rounded-lg border py-10 text-center text-muted-foreground">
          {t("list.empty")}
        </p>
      )}

      {/* Mobile: cards so nothing is hidden behind a horizontal scroll. */}
      <div className="grid gap-2.5 sm:hidden">
        {filtered.map((booking) => {
          const contact = booking.contacts[0];
          return (
            <div
              key={booking.id}
              className={cn(
                "grid gap-2 rounded-lg border p-3",
                booking.status === "cancelled" && "opacity-50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{contact?.name}</div>
                  {contact?.phone && (
                    <a href={`tel:${contact.phone}`} className="text-xs text-muted-foreground" dir="ltr">
                      {contact.phone}
                    </a>
                  )}
                </div>
                {statusBadge(booking)}
              </div>
              <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <span dir="ltr">{booking.checkIn} → {booking.checkOut}</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatMoney(bookingTotal(booking.rooms))}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm">
                  {roomsLabel(booking)}
                  <span className="text-muted-foreground">
                    {" · "}
                    {t("list.guests")}: {totalGuests(booking.guests)}
                  </span>
                </span>
                {rowActions(booking)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: full table. */}
      <div className="hidden overflow-x-auto rounded-lg border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("list.guest")}</TableHead>
              <TableHead>{t("list.dates")}</TableHead>
              <TableHead>{t("list.rooms")}</TableHead>
              <TableHead className="text-center">{t("list.guests")}</TableHead>
              <TableHead className="text-end">{t("list.total")}</TableHead>
              <TableHead>{t("list.status")}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((booking) => {
              const contact = booking.contacts[0];
              return (
                <TableRow
                  key={booking.id}
                  className={cn(booking.status === "cancelled" && "opacity-50")}
                >
                  <TableCell>
                    <div className="font-medium">{contact?.name}</div>
                    {contact?.phone && (
                      <a href={`tel:${contact.phone}`} className="text-xs text-muted-foreground">
                        {contact.phone}
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm" dir="ltr">
                    {booking.checkIn} → {booking.checkOut}
                  </TableCell>
                  <TableCell className="text-sm">{roomsLabel(booking)}</TableCell>
                  <TableCell className="text-center text-sm">{totalGuests(booking.guests)}</TableCell>
                  <TableCell className="text-end text-sm tabular-nums">
                    {formatMoney(bookingTotal(booking.rooms))}
                  </TableCell>
                  <TableCell>{statusBadge(booking)}</TableCell>
                  <TableCell>{rowActions(booking)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
