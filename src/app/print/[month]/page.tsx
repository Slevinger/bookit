import { cookies } from "next/headers";
import { getContainer } from "@/lib/container";
import { eachDateInRange, monthWindow, todayISO } from "@/lib/domain/dates";
import type { Booking, ISODate, Room } from "@/lib/domain/types";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "@/lib/i18n/dictionaries";
import { createTranslator } from "@/lib/i18n/translate";
import { PrintActions } from "@/components/print/print-actions";

export const dynamic = "force-dynamic";

const bookingFor = (bookings: Booking[], roomId: string, day: ISODate): Booking | undefined =>
  bookings.find(
    (b) =>
      b.status !== "cancelled" &&
      b.checkIn <= day &&
      day < b.checkOut &&
      b.rooms.some((r) => r.roomId === roomId),
  );

export default async function PrintMonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  const window = monthWindow(month);
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = cookieLocale === "en" ? "en" : DEFAULT_LOCALE;
  const { t, dateLocale } = createTranslator(locale);

  const { bookingService, roomService } = getContainer();
  const [allRooms, bookings] = await Promise.all([
    roomService.listRooms(),
    bookingService.listBookingsOverlapping(window.from, window.to),
  ]);
  const rooms: Room[] = allRooms.filter((r) => r.isActive);
  const days = eachDateInRange(window.from, window.to);
  const today = todayISO();

  const [y, m] = window.month.split("-").map(Number);
  const monthLabel = new Date(y, m - 1).toLocaleDateString(dateLocale, {
    month: "long",
    year: "numeric",
  });

  const weekday = (day: ISODate) =>
    new Date(`${day}T00:00:00`).toLocaleDateString(dateLocale, { weekday: "short" });
  const isWeekend = (day: ISODate) => {
    const dow = new Date(`${day}T00:00:00`).getDay();
    return dow === 5 || dow === 6; // Fri + Sat
  };

  const monthBookings = bookings.filter((b) => b.status !== "cancelled");

  return (
    <div className="min-h-dvh bg-white p-6 text-neutral-900 print:p-0">
      <div className="mx-auto max-w-4xl">
        <PrintActions month={window.month} monthLabel={monthLabel} bookings={monthBookings} rooms={rooms} />

        <h1 className="mb-4 text-2xl font-bold">{t("print.title", { month: monthLabel })}</h1>

        {monthBookings.length === 0 && (
          <p className="mb-4 text-neutral-500">{t("print.noBookings")}</p>
        )}

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-neutral-400 bg-neutral-100 px-2 py-1 text-start">
                {t("print.date")}
              </th>
              {rooms.map((room) => (
                <th key={room.id} className="border border-neutral-400 bg-neutral-100 px-2 py-1">
                  {room.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day} className={isWeekend(day) ? "bg-neutral-100" : undefined}>
                <td className="whitespace-nowrap border border-neutral-400 px-2 py-1 font-medium">
                  {Number(day.slice(8, 10))} · {weekday(day)}
                  {day === today && " ●"}
                </td>
                {rooms.map((room) => {
                  const booking = bookingFor(bookings, room.id, day);
                  const contact = booking?.contacts[0];
                  const isCheckIn = booking?.checkIn === day;
                  return (
                    <td
                      key={room.id}
                      className={`border border-neutral-400 px-2 py-1 text-center ${booking ? "bg-neutral-200" : ""}`}
                    >
                      {booking && (
                        <span className={isCheckIn ? "font-semibold" : undefined}>
                          {contact?.name}
                          {isCheckIn && contact?.phone && (
                            <span className="block text-xs text-neutral-600" dir="ltr">
                              {contact.phone}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
