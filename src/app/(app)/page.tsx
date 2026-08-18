import { getContainer } from "@/lib/container";
import { addDays, todayISO } from "@/lib/domain/dates";
import { CalendarView } from "@/components/calendar/calendar-view";

export const dynamic = "force-dynamic";

function monthWindow(month?: string): { from: string; to: string; month: string } {
  const valid = month && /^\d{4}-\d{2}$/.test(month) ? month : todayISO().slice(0, 7);
  const [y, m] = valid.split("-").map(Number);
  const from = `${valid}-01`;
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from, to: `${nextMonth}-01`, month: valid };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const window = monthWindow(month);
  const { bookingService, roomService } = getContainer();

  const [rooms, bookings] = await Promise.all([
    roomService.listRooms(),
    // Pad one day each side so bars clipped at month edges render correctly.
    bookingService.listBookingsOverlapping(addDays(window.from, -1), addDays(window.to, 1)),
  ]);

  return (
    <CalendarView
      rooms={rooms}
      bookings={bookings}
      month={window.month}
      from={window.from}
      to={window.to}
    />
  );
}
