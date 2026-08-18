import { getContainer } from "@/lib/container";
import { addDays, monthWindow } from "@/lib/domain/dates";
import { CalendarView } from "@/components/calendar/calendar-view";

export const dynamic = "force-dynamic";

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
