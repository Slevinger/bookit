"use client";

import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Sparkles, X } from "lucide-react";
import {
  BED_SHORTFALL_CODE,
  bedShortfallNote,
  bookingDraftSchema,
  bookingTotal,
  isEntireProperty,
  totalGuests,
} from "@/lib/domain/booking";
import {
  addDays,
  eachDateInRange,
  isISODate,
  isValidRange,
  isWeekendDate,
  nightsBetween,
} from "@/lib/domain/dates";
import {
  roomPricePerNight,
  roomPricingForSeason,
  roomStayBreakdown,
  roomStayPrice,
  type StayRateGroup,
} from "@/lib/domain/room";
import { isHighSeason } from "@/lib/domain/season";
import { hasTariff, tariffPricePerNight } from "@/lib/domain/tariff";
import { formatMoney } from "@/lib/format";
import type {
  Booking,
  BookingDraft,
  Contact,
  ISODate,
  Room,
  RoomAvailability,
  SeasonConfig,
  Tariff,
} from "@/lib/domain/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Wizard, type WizardStep } from "@/components/wizard";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface BookingFormInitial {
  checkIn: ISODate;
  checkOut: ISODate;
  roomIds?: string[];
  booking?: Booking;
}

export interface BookingFormProps {
  rooms: Room[];
  /** Property-wide price list used for entire-property bookings. */
  propertyTariff?: Tariff | null;
  /** High-season definition used to pick each night's price set. */
  seasonConfig?: SeasonConfig | null;
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

export function BookingForm({ rooms, propertyTariff, seasonConfig, initial, checkAvailability, onSubmit, submitLabel }: BookingFormProps) {
  const { t, tn, noteText, translateError } = useI18n();
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
  // A single agreed price used when the whole property is booked; null means
  // "derive from the rooms' nightly rates". Seeded from an edited whole-property
  // booking's existing total.
  const [propertyPriceOverride, setPropertyPriceOverride] = useState<number | null>(() =>
    editing && isEntireProperty(editing.rooms.map((r) => r.roomId), rooms)
      ? bookingTotal(editing.rooms)
      : null,
  );
  const [availabilityResponse, setAvailabilityResponse] = useState<{
    key: string;
    data: RoomAvailability[];
  } | null>(null);
  // Tentative = the guest is interested but hasn't closed the deal. Such holds
  // are shown in yellow and never block dates, so they can overlap other stays.
  const [tentative, setTentative] = useState(editing?.status === "tentative");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const checkOutRef = useRef<HTMLInputElement>(null);

  const nights = isValidRange(checkIn, checkOut) ? nightsBetween(checkIn, checkOut) : 0;

  // Remember the last valid stay length so editing check-in (which passes
  // through invalid intermediate values) can keep the same number of nights.
  const lastNightsRef = useRef(nights > 0 ? nights : 1);
  useEffect(() => {
    if (nights > 0) lastNightsRef.current = nights;
  }, [nights]);

  const isHigh = useCallback(
    (date: ISODate) => isHighSeason(date, seasonConfig),
    [seasonConfig],
  );

  // Which of the booked nights fall on high-season / holiday / weekend dates, so
  // the guest sees up front that the stay is priced as "special".
  const specialNights = useMemo(() => {
    if (!isValidRange(checkIn, checkOut)) {
      return { highSeason: 0, weekend: 0, holidays: [] as string[] };
    }
    const nightsInStay = eachDateInRange(checkIn, checkOut);
    const holidays = nightsInStay
      .map((d) => seasonConfig?.holidays.find((h) => h.date === d)?.title)
      .filter((title): title is string => !!title);
    return {
      highSeason: nightsInStay.filter((d) => isHigh(d)).length,
      weekend: nightsInStay.filter(isWeekendDate).length,
      holidays: [...new Set(holidays)],
    };
  }, [checkIn, checkOut, isHigh, seasonConfig]);

  // Whole-stay price, summed per night so a stay crossing into high season
  // mixes both price sets correctly.
  const defaultPrice = useCallback(
    (room: Room): number =>
      isValidRange(checkIn, checkOut)
        ? roomStayPrice(room, { adults, children }, checkIn, checkOut, isHigh, isWeekendDate)
        : roomPricePerNight(roomPricingForSeason(room, false), { adults, children }),
    [checkIn, checkOut, adults, children, isHigh],
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

  const activeRooms = useMemo(() => rooms.filter((r) => r.isActive), [rooms]);
  const entire = isEntireProperty([...selectedIds], rooms);
  const entireDefault = useMemo(
    () =>
      hasTariff(propertyTariff)
        ? tariffPricePerNight(propertyTariff, { adults, children }) * Math.max(nights, 1)
        : activeRooms.reduce((sum, room) => sum + defaultPrice(room), 0),
    [propertyTariff, adults, children, nights, activeRooms, defaultPrice],
  );
  const propertyPrice = propertyPriceOverride ?? entireDefault;

  const selectedRooms = useMemo(
    () => [...selectedIds].map((roomId) => ({ roomId, price: priceFor(roomId) })),
    [selectedIds, priceFor],
  );
  // When the whole property is booked, the agreed price is a single figure; it
  // is stored on the first room (0 on the rest) so the total is preserved while
  // per-room pricing stays meaningful for partial bookings.
  const finalRooms = useMemo(
    () =>
      entire
        ? [...selectedIds].map((roomId, i) => ({ roomId, price: i === 0 ? propertyPrice : 0 }))
        : selectedRooms,
    [entire, selectedIds, propertyPrice, selectedRooms],
  );
  const total = entire ? propertyPrice : bookingTotal(selectedRooms);
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

  // One tap to book (or release) the whole facility.
  function toggleEntire() {
    setPropertyPriceOverride(null);
    setSelectedIds((prev) =>
      isEntireProperty([...prev], rooms) ? new Set() : new Set(activeRooms.map((r) => r.id)),
    );
  }

  function updateContact(key: number, patch: Partial<Contact>) {
    setContacts((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  }

  async function handleFinish() {
    const draft: BookingDraft = {
      checkIn,
      checkOut,
      rooms: finalRooms,
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
      // Keep cancelled bookings cancelled; otherwise reflect the tentative toggle.
      status:
        editing?.status === "cancelled" ? "cancelled" : tentative ? "tentative" : "confirmed",
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
    if (!result.ok && result.error) setSubmitError(translateError(result.error));
  }

  const roomName = (roomId: string) => rooms.find((r) => r.id === roomId)?.name ?? roomId;

  const steps: WizardStep[] = [
    {
      id: "dates",
      title: t("booking.step.dates"),
      validate: () => (isValidRange(checkIn, checkOut) ? null : t("booking.error.invalidRange")),
      content: (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="checkIn" className="text-base">{t("booking.checkIn")}</Label>
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
                  // Move the guest straight to picking the end date.
                  checkOutRef.current?.focus();
                }
              }}
            />
          </div>
          <Stepper
            label={t("booking.nights")}
            value={Math.max(nights, 1)}
            min={1}
            onChange={(value) => setCheckOut(addDays(checkIn, value))}
          />
          <div className="grid gap-2">
            <Label htmlFor="checkOut" className="text-base">{t("booking.checkOut")}</Label>
            <Input
              ref={checkOutRef}
              id="checkOut"
              type="date"
              className="h-13 text-base"
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">{t("booking.checkOutHint")}</p>
          </div>
          {(specialNights.highSeason > 0 || specialNights.weekend > 0) && (
            <div className="grid gap-1 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-300">
              <p className="flex items-center gap-1.5 font-medium">
                <Sparkles className="size-4" /> {t("booking.specialDates")}
              </p>
              {specialNights.highSeason > 0 && (
                <p>{tn("booking.highSeasonNights", specialNights.highSeason)}</p>
              )}
              {specialNights.weekend > 0 && (
                <p>{tn("booking.weekendNights", specialNights.weekend)}</p>
              )}
              {specialNights.holidays.length > 0 && (
                <p>{t("booking.holidaysInStay", { list: specialNights.holidays.join(", ") })}</p>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "guests",
      title: t("booking.step.guests"),
      content: (
        <div className="grid gap-5">
          <Stepper label={t("booking.adults")} value={adults} min={1} onChange={setAdults} />
          <Stepper label={t("booking.children")} value={children} min={0} onChange={setChildren} />
        </div>
      ),
    },
    {
      id: "rooms",
      title: t("booking.step.rooms"),
      validate: () => {
        if (selectedRooms.length === 0) return t("booking.error.noRooms");
        // The conflict message is already shown inline in the step content;
        // block silently instead of doubling it. Tentative holds are allowed to
        // overlap, so they don't block on unavailability.
        if (!tentative && unavailableSelected.length > 0) return "";
        return null;
      },
      content: (
        <div className="grid gap-3">
          {activeRooms.length >= 2 && (
            <Button
              type="button"
              variant={entire ? "default" : "outline"}
              size="lg"
              aria-pressed={entire}
              onClick={toggleEntire}
              className="h-14 justify-between text-base"
            >
              <span className="font-semibold">{t("booking.entireProperty")}</span>
              <span className="text-sm font-normal opacity-80">{t("booking.entirePropertyHint")}</span>
            </Button>
          )}
          <div className="flex flex-wrap gap-2.5">
            {activeRooms.map((room) => {
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
          {entire ? (
            <div className="grid gap-3 rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{t("booking.entireProperty")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("booking.stayPrice", { nights: tn("booking.nightsCount", nights) })}
                  </p>
                </div>
                <PriceInput
                  aria-label={t("booking.entirePropertyPrice")}
                  className="h-12 w-32 text-base"
                  value={propertyPrice}
                  onChange={setPropertyPriceOverride}
                />
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                <span>{t("booking.totalForStay")}</span>
                <span data-testid="booking-total">{formatMoney(total)}</span>
              </div>
            </div>
          ) : (
            selectedRooms.length > 0 && (
              <div className="grid gap-3 rounded-xl border p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("booking.stayPrice", { nights: tn("booking.nightsCount", nights) })}
                </p>
                {selectedRooms.map(({ roomId, price }) => {
                  const room = rooms.find((r) => r.id === roomId);
                  const groups =
                    room && nights > 0
                      ? roomStayBreakdown(
                          room,
                          { adults, children },
                          checkIn,
                          checkOut,
                          isHigh,
                          isWeekendDate,
                        )
                      : [];
                  const computed = groups.reduce((sum, g) => sum + g.subtotal, 0);
                  const overridden = priceOverrides.has(roomId) && price !== computed;
                  return (
                    <div key={roomId} className="grid gap-2 border-b pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-medium">{roomName(roomId)}</p>
                        </div>
                        <PriceInput
                          aria-label={t("booking.priceFor", { room: roomName(roomId) })}
                          className="h-12 w-32 text-base"
                          value={price}
                          onChange={(value) => setPrice(roomId, value)}
                        />
                      </div>
                      {groups.length > 0 && <RoomReceipt groups={groups} />}
                      {overridden && (
                        <p className="text-xs text-muted-foreground">
                          {t("booking.autoPrice", { price: formatMoney(computed) })}
                        </p>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                  <span>{t("booking.totalForStay")}</span>
                  <span data-testid="booking-total">{formatMoney(total)}</span>
                </div>
              </div>
            )
          )}
          {unavailableSelected.length > 0 && (
            <p className="text-base font-medium text-destructive">
              {t("booking.error.unavailable", {
                rooms: unavailableSelected.map((a) => a.room.name).join(", "),
              })}
            </p>
          )}
          {bedWarning && (
            <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-base font-medium text-amber-600 dark:text-amber-400">
              {noteText(bedWarning)}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "contact",
      title: t("booking.step.contact"),
      validate: () =>
        contacts[0]?.name.trim() && contacts[0]?.phone.trim()
          ? null
          : t("booking.error.contactRequired"),
      content: (
        <div className="grid gap-3">
          {contacts.map((contact, index) => (
            <div key={contact.key} className="grid gap-3 rounded-xl border p-4">
              <div className="grid gap-2">
                <Label htmlFor={`contact-name-${contact.key}`} className="text-base">
                  {t("booking.contactName")}
                </Label>
                <Input
                  id={`contact-name-${contact.key}`}
                  className="h-13 text-base"
                  value={contact.name}
                  onChange={(e) => updateContact(contact.key, { name: e.target.value })}
                  placeholder={t("booking.contactNamePlaceholder")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`contact-phone-${contact.key}`} className="text-base">
                  {t("booking.phone")}
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
                    {t("booking.email")}
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
                    aria-label={t("booking.removeContact")}
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
            <Plus className="size-5" /> {t("booking.addContact")}
          </Button>
          <div className="grid gap-2">
            <Label htmlFor="booking-notes" className="text-base">{t("booking.notes")}</Label>
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
      title: t("booking.step.confirm"),
      content: (
        <div className="grid gap-3 text-base">
          <SummaryRow
            label={t("booking.summary.dates")}
            value={`${checkIn} → ${checkOut} (${tn("booking.nightsCount", nights)})`}
            ltr
          />
          {(specialNights.highSeason > 0 || specialNights.holidays.length > 0) && (
            <p className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-400">
              <Sparkles className="size-4 shrink-0" />
              {specialNights.holidays.length > 0
                ? t("booking.holidaysInStay", { list: specialNights.holidays.join(", ") })
                : t("booking.specialDates")}
            </p>
          )}
          <SummaryRow
            label={t("booking.summary.guests")}
            value={t("booking.summary.guestsValue", {
              total: totalGuests({ adults, children }),
              adults,
              children,
            })}
          />
          <SummaryRow
            label={t("booking.summary.rooms")}
            value={
              entire
                ? `${t("booking.entireProperty")} — ${formatMoney(propertyPrice)}`
                : selectedRooms.map((r) => `${roomName(r.roomId)} — ${formatMoney(r.price)}`).join(", ")
            }
          />
          <SummaryRow label={t("booking.summary.total")} value={formatMoney(total)} strong />
          <SummaryRow
            label={t("booking.summary.contact")}
            value={`${contacts[0]?.name ?? ""} · ${contacts[0]?.phone ?? ""}`}
          />
          {notes && <SummaryRow label={t("booking.summary.notes")} value={notes} />}
          {bedWarning && (
            <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 font-medium text-amber-600 dark:text-amber-400">
              {noteText(bedWarning)} {t("booking.bedWarningNote")}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3">
            <div className="grid gap-0.5">
              <span className="font-medium">{t("booking.tentativeLabel")}</span>
              <span className="text-sm text-muted-foreground">{t("booking.tentativeHint")}</span>
            </div>
            <Button
              type="button"
              variant={tentative ? "default" : "outline"}
              size="lg"
              aria-pressed={tentative}
              className={cn(
                "shrink-0",
                tentative && "bg-yellow-400 text-yellow-950 hover:bg-yellow-400/90",
              )}
              onClick={() => setTentative((v) => !v)}
            >
              {tentative ? t("booking.status.tentative") : t("booking.status.confirmed")}
            </Button>
          </div>
          {submitError && (
            <p role="alert" className="font-medium text-destructive">
              {submitError}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <Wizard
      steps={steps}
      onFinish={handleFinish}
      finishLabel={submitLabel ?? t("booking.saveBooking")}
      submitting={submitting}
    />
  );
}

function RoomReceipt({ groups }: { groups: StayRateGroup[] }) {
  const { t, tn } = useI18n();
  const label = (g: StayRateGroup) =>
    g.high
      ? g.weekend
        ? t("booking.receipt.highWeekend")
        : t("booking.receipt.highMidweek")
      : g.weekend
        ? t("booking.receipt.lowWeekend")
        : t("booking.receipt.lowMidweek");
  const composition = (g: StayRateGroup) => {
    const parts = [t("booking.receipt.base", { price: formatMoney(g.base) })];
    if (g.extraAdults > 0 && g.extraAdultPrice > 0) {
      parts.push(
        t("booking.receipt.extraAdults", { n: g.extraAdults, price: formatMoney(g.extraAdultPrice) }),
      );
    }
    if (g.children > 0 && g.extraChildPrice > 0) {
      parts.push(t("booking.receipt.extraChildren", { n: g.children, price: formatMoney(g.extraChildPrice) }));
    }
    return parts.join(" + ");
  };
  return (
    <div className="grid gap-1.5">
      {groups.map((g, i) => (
        <div key={i} className="grid gap-0.5">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {label(g)} · {tn("booking.nightsCount", g.nights)}
            </span>
            <span className="tabular-nums">{formatMoney(g.subtotal)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("booking.receipt.line", { nights: g.nights, price: formatMoney(g.perNight) })}
            {g.perNight !== g.base && ` · ${composition(g)}`}
          </p>
        </div>
      ))}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
  ltr = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-end", strong && "font-bold")} dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </div>
  );
}

function PriceInput({
  value,
  onChange,
  ...props
}: {
  value: number;
  onChange: (value: number) => void;
} & Omit<ComponentProps<typeof Input>, "value" | "onChange" | "type">) {
  // While the field is being edited we keep the raw text so an emptied field
  // stays empty (showing the placeholder) instead of snapping back to 0.
  const [raw, setRaw] = useState<string | null>(null);
  return (
    <Input
      type="number"
      min={0}
      step="any"
      inputMode="decimal"
      placeholder="0"
      value={raw ?? String(value)}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const next = e.target.value;
        setRaw(next);
        onChange(next === "" ? 0 : Number(next));
      }}
      onBlur={() => setRaw(null)}
      {...props}
    />
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
  const { t } = useI18n();
  return (
    <div className="grid gap-2">
      <Label className="text-base">{label}</Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-13 rounded-full"
          aria-label={t("stepper.decrease", { label })}
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="size-6" />
        </Button>
        <span className="w-12 text-center text-2xl font-bold tabular-nums" aria-label={label}>
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-13 rounded-full"
          aria-label={t("stepper.increase", { label })}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-6" />
        </Button>
      </div>
    </div>
  );
}
