import { getContainer } from "@/lib/container";
import { BookingsList } from "@/components/booking/bookings-list";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const { bookingService, roomService } = getContainer();
  const [bookings, rooms] = await Promise.all([
    bookingService.listAllBookings(),
    roomService.listRooms(),
  ]);

  return <BookingsList bookings={bookings} rooms={rooms} />;
}
