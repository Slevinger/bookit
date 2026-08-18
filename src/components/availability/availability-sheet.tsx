"use client";

import { useEffect, useState } from "react";
import { checkAvailabilityAction } from "@/lib/actions/bookings";
import { addDays, isValidRange, todayISO } from "@/lib/domain/dates";
import type { Room, RoomAvailability } from "@/lib/domain/types";
import { useBookingDialog } from "@/components/booking/booking-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { AvailabilityTimeline } from "./availability-timeline";

export function AvailabilitySheet({ children }: { rooms: Room[]; children: React.ReactNode }) {
  const { t, tn } = useI18n();
  const { openNew } = useBookingDialog();
  const [open, setOpen] = useState(false);
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(addDays(todayISO(), 1));
  const [response, setResponse] = useState<{ key: string; data: RoomAvailability[] } | null>(null);

  const requestKey = open && isValidRange(checkIn, checkOut) ? `${checkIn}|${checkOut}` : null;
  const result = requestKey && response?.key === requestKey ? response.data : null;
  const loading = requestKey !== null && result === null;

  useEffect(() => {
    if (!requestKey) return;
    const [from, to] = requestKey.split("|");
    let stale = false;
    checkAvailabilityAction(from, to).then((res) => {
      if (!stale && res.ok) setResponse({ key: requestKey, data: res.data });
    });
    return () => {
      stale = true;
    };
  }, [requestKey]);

  function handleBook(roomIds: string[]) {
    setOpen(false);
    openNew({ checkIn, checkOut, roomIds });
  }

  const freeCount = result?.filter((r) => r.available).length ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto p-4 sm:p-6">
        <SheetHeader className="p-0">
          <SheetTitle>{t("availability.title")}</SheetTitle>
          <SheetDescription>{t("availability.description")}</SheetDescription>
        </SheetHeader>

        <div className="mx-auto grid w-full max-w-3xl gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="avail-from">{t("availability.from")}</Label>
              <Input id="avail-from" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="avail-to">{t("availability.to")}</Label>
              <Input id="avail-to" type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>

          {loading && <p className="text-sm text-muted-foreground">{t("availability.checking")}</p>}

          {result && !loading && (
            <>
              <p className="text-sm text-muted-foreground">
                {freeCount === 0 ? t("availability.none") : tn("availability.count", freeCount)}
              </p>
              <AvailabilityTimeline result={result} checkIn={checkIn} checkOut={checkOut} onBook={handleBook} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
