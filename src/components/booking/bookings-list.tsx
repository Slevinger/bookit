"use client";

import { useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { bookingTotal, totalGuests } from "@/lib/domain/booking";
import { todayISO } from "@/lib/domain/dates";
import type { Booking, Room } from "@/lib/domain/types";
import { useBookingDialog } from "@/components/booking/booking-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function BookingsList({ bookings, rooms }: { bookings: Booking[]; rooms: Room[] }) {
  const { openEdit } = useBookingDialog();
  const [query, setQuery] = useState("");
  const [showPast, setShowPast] = useState(false);
  const today = todayISO();

  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? id;

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
        <h1 className="text-lg font-semibold">Bookings</h1>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search guest, phone, room..."
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPast((v) => !v)}>
          {showPast ? "Hide past" : "Show past"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Rooms</TableHead>
              <TableHead className="text-center">Guests</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No bookings found.
                </TableCell>
              </TableRow>
            )}
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
                  <TableCell className="whitespace-nowrap text-sm">
                    {booking.checkIn} → {booking.checkOut}
                  </TableCell>
                  <TableCell className="text-sm">
                    {booking.rooms.map((r) => roomName(r.roomId)).join(", ")}
                  </TableCell>
                  <TableCell className="text-center text-sm">{totalGuests(booking.guests)}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {bookingTotal(booking.rooms).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit booking"
                      onClick={() => openEdit(booking)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
