"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import {
  BED_SHORTFALL_CODE,
  bedShortfallNote,
  bookingDraftSchema,
  bookingTotal,
  totalGuests,
} from "@/lib/domain/booking";
import { addDays, isISODate, isValidRange, nightsBetween } from "@/lib/domain/dates";
import type { Booking, BookingDraft, Contact, ISODate, Room, RoomAvailability } from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wizard, type WizardStep } from "@/components/wizard";
import { cn } from "@/lib/utils";

export interface BookingFormInitial {
  checkIn: ISODate;
  checkOut: ISODate;
  roomIds?: string[];
  booking?: Booking;
}

export interface BookingFormProps {
  rooms: Room[];
  initial: BookingFormInitial;
  checkAvailability: (
    checkIn: ISODate,
    checkOut: ISODate,
    excludeBookingId?: string,
  ) => Promise<RoomAvailability[]>;
  onSubmit: (draft: BookingDraft) => Promise<{ ok: boolean; error?: string }>;
  submitLabel?: string;
}

interface ContactForm extends Contact {
  key: number;
}

const emptyContact = (key: number): ContactForm => ({ key, name: "", phone: "", email: "" });

export function BookingForm({ rooms, initial, checkAvailability, onSubmit, submitLabel = "Save booking" }: BookingFormProps) {
  const editing = initial.booking;
  const [checkIn, setCheckIn] = useState(editing?.checkIn ?? initial.checkIn);
  const [checkOut, setCheckOut] = useState(editing?.checkOut ?? initial.checkOut);
  const [adults, setAdults] = useState(editing?.guests.adults ?? 2);
  const [children, setChildren] = useState(editing?.guests.children ?? 0);
  // The textarea edits the booking's own free-text note; auto/system notes are
  // preserved separately and the bed-shortfall note is recomputed by the service.
  const [notes, setNotes] = useState(
    editing?.notes.find((n) => n.type === "info" && !n.code)?.text ?? "",
  );
  const preservedNotes =
    editing?.notes.filter(
      (n) => !(n.type === "info" && !n.code) && n.code !== BED_SHORTFALL_CODE,
    ) ?? [];
  const [contacts, setContacts] = useState<ContactForm[]>(
    editing?.contacts.map((c, i) => ({ ...c, key: i })) ?? [emptyContact(0)],
  );
  // Selection and pricing are kept separate so untouched prices can be derived
  // from basePrice * nights at render time (they follow date changes for free).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(editing ? editing.rooms.map((r) => r.roomId) : (initial.roomIds ?? [])),
  );
  /** roomId -> explicitly set price (edited bookings keep their agreed prices). */
  const [priceOverrides, setPriceOverrides] = useState<Map<string, number>>(
    () => new Map(editing ? editing.rooms.map((r) => [r.roomId, r.price]) : []),
  );
  const [availabilityResponse, setAvailabilityResponse] = useState<{
    key: string;
    data: RoomAvailability[];
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nights = isValidRange(checkIn, checkOut) ? nightsBetween(checkIn, checkOut) : 0;

  // Remember the last valid stay length so editing check-in (which passes
  // through invalid intermediate values) can keep the same number of nights.
  const lastNightsRef = useRef(nights > 0 ? nights : 1);
  useEffect(() => {
    if (nights > 0) lastNightsRef.current = nights;
  }, [nights]);

  const defaultPrice = useCallback(
    (room: Room) => room.basePrice * Math.max(nights, 1),
    [nights],
  );

  const priceFor = useCallback(
    (roomId: string): number => {
      const override = priceOverrides.get(roomId);
      if (override !== undefined) return override;
      const room = rooms.find((r) => r.id === roomId);
      return room ? defaultPrice(room) : 0;
    },
    [priceOverrides, rooms, defaultPrice],
  );

  // Live availability check.
  const availabilityKey = isValidRange(checkIn, checkOut)
    ? `${checkIn}|${checkOut}|${editing?.id ?? ""}`
    : null;
  const availability =
    availabilityKey && availabilityResponse?.key === availabilityKey
      ? availabilityResponse.data
      : null;

  useEffect(() => {
    if (!availabilityKey) return;
    const [from, to, excludeId] = availabilityKey.split("|");
    let stale = false;
    checkAvailability(from, to, excludeId || undefined).then((result) => {
      if (!stale) setAvailabilityResponse({ key: availabilityKey, data: result });
    });
    return () => {
      stale = true;
    };
  }, [availabilityKey, checkAvailability]);

  const availabilityByRoom = useMemo(
    () => new Map((availability ?? []).map((a) => [a.room.id, a])),
    [availability],
  );

  const selectedRooms = useMemo(
    () => [...selectedIds].map((roomId) => ({ roomId, price: priceFor(roomId) })),
    [selectedIds, priceFor],
  );
  const total = bookingTotal(selectedRooms);
  const unavailableSelected = selectedRooms
    .map((r) => availabilityByRoom.get(r.roomId))
    .filter((a): a is RoomAvailability => !!a && !a.available);
  const bedWarning = bedShortfallNote(
    { adults, children },
    rooms.filter((r) => selectedIds.has(r.id)),
  );

  function toggleRoom(room: Room) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(room.id)) {
        next.delete(room.id);
      } else {
        next.add(room.id);
      }
      return next;
    });
    // Deselecting clears any custom price so re-selecting starts fresh.
    setPriceOverrides((prev) => {
      if (!prev.has(room.id)) return prev;
      const next = new Map(prev);
      next.delete(room.id);
      return next;
    });
  }

  function setPrice(roomId: string, value: number) {
    setPriceOverrides((prev) => new Map(prev).set(roomId, value));
  }

  function updateContact(key: number, patch: Partial<Contact>) {
    setContacts((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  async function handleFinish() {
    const draft: BookingDraft = {
      checkIn,
      checkOut,
      rooms: selectedRooms,
      guests: { adults, children },
      contacts: contacts.map(({ name, phone, email, notes: contactNotes }) => ({
        name,
        phone,
        email,
        notes: contactNotes,
      })),
      notes: [
        ...preservedNotes,
        ...(notes.trim() ? [{ type: "info" as const, text: notes.trim() }] : []),
      ],
    };
    const parsed = bookingDraftSchema.safeParse(draft);
    if (!parsed.success) {
      setSubmitError([...new Set(parsed.error.issues.map((i) => i.message))].join(". "));
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    const result = await onSubmit(draft);
    setSubmitting(false);
    if (!result.ok && result.error) setSubmitError(result.error);
  }

  const roomName = (roomId: string) => rooms.find((r) => r.id === roomId)?.name ?? roomId;

  const steps: WizardStep[] = [
    {
      id: "dates",
      title: "When are they staying?",
      validate: () => (isValidRange(checkIn, checkOut) ? null : "Check-out must be after check-in."),
      content: (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="checkIn" className="text-base">Check-in</Label>
            <Input
              id="checkIn"
              type="date"
              className="h-13 text-base"
              value={checkIn}
              onChange={(e) => {
                const nextCheckIn = e.target.value;
                setCheckIn(nextCheckIn);
                // Keep the stay length: shift check-out along with check-in.
                if (isISODate(nextCheckIn)) {
                  const stay = nights > 0 ? nights : lastNightsRef.current;
                  setCheckOut(addDays(nextCheckIn, stay));
                }
              }}
            />
          </div>
          <Stepper
            label="Nights"
            value={Math.max(nights, 1)}
            min={1}
            onChange={(value) => setCheckOut(addDays(checkIn, value))}
          />
          <div className="grid gap-2">
            <Label htmlFor="checkOut" className="text-base">Check-out</Label>
            <Input
              id="checkOut"
              type="date"
              className="h-13 text-base"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Filled in automatically from the nights — change it only if you need to.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "guests",
      title: "Who is coming?",
      content: (
        <div className="grid gap-5">
          <Stepper label="Adults" value={adults} min={1} onChange={setAdults} />
          <Stepper label="Children" value={children} min={0} onChange={setChildren} />
        </div>
      ),
    },
    {
      id: "rooms",
      title: "Which rooms?",
      validate: () => {
        if (selectedRooms.length === 0) return "Select at least one room.";
        if (unavailableSelected.length > 0) {
          return `${unavailableSelected.map((a) => a.room.name).join(", ")} not available for these dates.`;
        }
        return null;
      },
      content: (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2.5">
            {rooms.filter((r) => r.isActive).map((room) => {
              const selected = selectedIds.has(room.id);
              const roomAvailability = availabilityByRoom.get(room.id);
              const unavailable = roomAvailability ? !roomAvailability.available : false;
              return (
                <Button
                  key={room.id}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  size="lg"
                  onClick={() => toggleRoom(room)}
                  className={cn("h-12 text-base", unavailable && !selected && "opacity-50 line-through")}
                >
                  {room.name}
                </Button>
              );
            })}
          </div>
          {selectedRooms.length > 0 && (
            <div className="grid gap-3 rounded-xl border p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Price for the whole stay ({nights} night{nights === 1 ? "" : "s"})
              </p>
              {selectedRooms.map(({ roomId, price }) => {
                const room = rooms.find((r) => r.id === roomId);
                return (
                  <div key={roomId} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base">{roomName(roomId)}</p>
                      {room && nights > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {room.basePrice.toLocaleString()} / night × {nights}
                        </p>
                      )}
                    </div>
                    <Input
                      aria-label={`Price for ${roomName(roomId)}`}
                      type="number"
                      min={0}
                      step="any"
                      className="h-12 w-32 text-base"
                      value={price}
                      onChange={(e) => setPrice(roomId, Number(e.target.value))}
                    />
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                <span>Total for the stay</span>
                <span data-testid="booking-total">{total.toLocaleString()}</span>
              </div>
            </div>
          )}
          {unavailableSelected.length > 0 && (
            <p className="text-base font-medium text-destructive">
              {unavailableSelected.map((a) => a.room.name).join(", ")} not available for these dates.
            </p>
          )}
          {bedWarning && (
            <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-base font-medium text-amber-600 dark:text-amber-400">
              {bedWarning.text}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "contact",
      title: "Contact details",
      validate: () =>
        contacts[0]?.name.trim() && contacts[0]?.phone.trim()
          ? null
          : "Contact name and phone are required.",
      content: (
        <div className="grid gap-3">
          {contacts.map((contact, index) => (
            <div key={contact.key} className="grid gap-3 rounded-xl border p-4">
              <div className="grid gap-2">
                <Label htmlFor={`contact-name-${contact.key}`} className="text-base">
                  Contact name
                </Label>
                <Input
                  id={`contact-name-${contact.key}`}
                  className="h-13 text-base"
                  value={contact.name}
                  onChange={(e) => updateContact(contact.key, { name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`contact-phone-${contact.key}`} className="text-base">
                  Phone
                </Label>
                <Input
                  id={`contact-phone-${contact.key}`}
                  type="tel"
                  className="h-13 text-base"
                  value={contact.phone}
                  onChange={(e) => updateContact(contact.key, { phone: e.target.value })}
                  placeholder="050-0000000"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="grid flex-1 gap-2">
                  <Label htmlFor={`contact-email-${contact.key}`} className="text-base">
                    Email (optional)
                  </Label>
                  <Input
                    id={`contact-email-${contact.key}`}
                    type="email"
                    className="h-13 text-base"
                    value={contact.email ?? ""}
                    onChange={(e) => updateContact(contact.key, { email: e.target.value })}
                  />
                </div>
                {index > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label="Remove contact"
                    onClick={() => setContacts((prev) => prev.filter((c) => c.key !== contact.key))}
                  >
                    <X className="size-5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="justify-start text-base"
            onClick={() => setContacts((prev) => [...prev, emptyContact(Math.max(...prev.map((c) => c.key)) + 1)])}
          >
            <Plus className="size-5" /> Add another contact
          </Button>
          <div className="grid gap-2">
            <Label htmlFor="booking-notes" className="text-base">Notes (optional)</Label>
            <Textarea
              id="booking-notes"
              className="text-base"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      ),
    },
    {
      id: "confirm",
      title: "Everything correct?",
      content: (
        <div className="grid gap-3 text-base">
          <SummaryRow label="Dates" value={`${checkIn} → ${checkOut} (${nights} night${nights === 1 ? "" : "s"})`} />
          <SummaryRow label="Guests" value={`${totalGuests({ adults, children })} (${adults} adults, ${children} children)`} />
          <SummaryRow
            label="Rooms"
            value={selectedRooms.map((r) => `${roomName(r.roomId)} — ${r.price.toLocaleString()}`).join(", ")}
          />
          <SummaryRow label="Total" value={total.toLocaleString()} strong />
          <SummaryRow label="Contact" value={`${contacts[0]?.name ?? ""} · ${contacts[0]?.phone ?? ""}`} />
          {notes && <SummaryRow label="Notes" value={notes} />}
          {bedWarning && (
            <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 font-medium text-amber-600 dark:text-amber-400">
              {bedWarning.text} A note will be added to the booking.
            </p>
          )}
          {submitError && (
            <p role="alert" className="font-medium text-destructive">
              {submitError}
            </p>
          )}
        </div>
      ),
    },
  ];

  return <Wizard steps={steps} onFinish={handleFinish} finishLabel={submitLabel} submitting={submitting} />;
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right", strong && "font-bold")}>{value}</span>
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-base">{label}</Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-13 rounded-full"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="size-6" />
        </Button>
        <span className="w-12 text-center text-2xl font-bold tabular-nums" aria-label={label.toLowerCase()}>
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-13 rounded-full"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-6" />
        </Button>
      </div>
    </div>
  );
}
