import { getTenantContainer } from "@/lib/container";
import { requireTenant } from "@/lib/auth/tenant";
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
  const { bookingService, roomService, seasonService } = getTenantContainer(await requireTenant());
  // Make sure the year(s) shown are imported, so "every new year" fills in on view.
  const year = Number(window.month.slice(0, 4));

  const [rooms, bookings, seasonConfig] = await Promise.all([
    roomService.listRooms(),
    // Pad one day each side so bars clipped at month edges render correctly.
    bookingService.listBookingsOverlapping(addDays(window.from, -1), addDays(window.to, 1)),
    seasonService
      .ensureYears([year, year + 1])
      .catch(() => seasonService.getSeason()),
  ]);

  return (
    <CalendarView
      rooms={rooms}
      bookings={bookings}
      seasonConfig={seasonConfig}
      month={window.month}
      from={window.from}
      to={window.to}
    />
  );
}
