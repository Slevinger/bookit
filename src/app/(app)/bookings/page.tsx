import { getTenantContainer } from "@/lib/container";
import { requireTenant } from "@/lib/auth/tenant";
import { BookingsList } from "@/components/booking/bookings-list";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const { bookingService, roomService } = getTenantContainer(await requireTenant());
  const [bookings, rooms] = await Promise.all([
    bookingService.listAllBookings(),
    roomService.listRooms(),
  ]);

  return <BookingsList bookings={bookings} rooms={rooms} />;
}
