import { getTenantContainer } from "@/lib/container";
import { requireTenant } from "@/lib/auth/tenant";
import { BookingDialogProvider } from "@/components/booking/booking-dialog";
import { AppNav } from "@/components/app-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const container = getTenantContainer(await requireTenant());
  const [rooms, propertyTariff, seasonConfig] = await Promise.all([
    container.roomService.listRooms(),
    container.tariffService.getTariff(),
    container.seasonService.getSeason(),
  ]);

  return (
    <BookingDialogProvider rooms={rooms} propertyTariff={propertyTariff} seasonConfig={seasonConfig}>
      <div className="flex min-h-dvh flex-col">
        <AppNav rooms={rooms} />
        <main className="flex min-h-0 flex-1 flex-col p-3 pb-28 sm:p-6 md:pb-6">{children}</main>
      </div>
    </BookingDialogProvider>
  );
}
