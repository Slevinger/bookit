"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  checkAvailabilityAction,
  createBookingAction,
  updateBookingAction,
} from "@/lib/actions/bookings";
import { todayISO, addDays } from "@/lib/domain/dates";
import type { Booking, BookingDraft, ISODate, Room } from "@/lib/domain/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { BookingForm, type BookingFormInitial } from "./booking-form";

interface OpenNewOptions {
  checkIn?: ISODate;
  checkOut?: ISODate;
  roomIds?: string[];
}

interface BookingDialogApi {
  openNew: (options?: OpenNewOptions) => void;
  openEdit: (booking: Booking) => void;
}

const BookingDialogContext = createContext<BookingDialogApi | null>(null);

export function useBookingDialog(): BookingDialogApi {
  const api = useContext(BookingDialogContext);
  if (!api) throw new Error("useBookingDialog must be used within BookingDialogProvider");
  return api;
}

export function BookingDialogProvider({ rooms, children }: { rooms: Room[]; children: React.ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const [initial, setInitial] = useState<BookingFormInitial | null>(null);

  const openNew = useCallback((options?: OpenNewOptions) => {
    const checkIn = options?.checkIn ?? todayISO();
    setInitial({
      checkIn,
      checkOut: options?.checkOut ?? addDays(checkIn, 1),
      roomIds: options?.roomIds ?? [],
    });
  }, []);

  const openEdit = useCallback((booking: Booking) => {
    setInitial({ checkIn: booking.checkIn, checkOut: booking.checkOut, booking });
  }, []);

  const api = useMemo(() => ({ openNew, openEdit }), [openNew, openEdit]);

  const checkAvailability = useCallback(
    async (checkIn: ISODate, checkOut: ISODate, excludeBookingId?: string) => {
      const result = await checkAvailabilityAction(checkIn, checkOut, excludeBookingId);
      return result.ok ? result.data : [];
    },
    [],
  );

  async function handleSubmit(draft: BookingDraft) {
    const editing = initial?.booking;
    const result = editing
      ? await updateBookingAction(editing.id, draft)
      : await createBookingAction(draft);
    if (result.ok) {
      toast.success(editing ? t("booking.updated") : t("booking.created"));
      setInitial(null);
      router.refresh();
    }
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }

  return (
    <BookingDialogContext.Provider value={api}>
      {children}
      <Dialog open={initial !== null} onOpenChange={(open) => !open && setInitial(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{initial?.booking ? t("booking.title.edit") : t("booking.title.new")}</DialogTitle>
          </DialogHeader>
          {initial && (
            <BookingForm
              rooms={rooms}
              initial={initial}
              checkAvailability={checkAvailability}
              onSubmit={handleSubmit}
            />
          )}
        </DialogContent>
      </Dialog>
    </BookingDialogContext.Provider>
  );
}
