import { getContainer } from "@/lib/container";
import { BookingDialogProvider } from "@/components/booking/booking-dialog";
import { AppNav } from "@/components/app-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const rooms = await getContainer().roomService.listRooms();

  return (
    <BookingDialogProvider rooms={rooms}>
      <div className="flex min-h-dvh flex-col">
        <AppNav rooms={rooms} />
        <main className="flex-1 p-3 pb-28 sm:p-6 md:pb-6">{children}</main>
      </div>
    </BookingDialogProvider>
  );
}
