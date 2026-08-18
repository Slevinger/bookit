import { getTenantContainer } from "@/lib/container";
import { requireTenant } from "@/lib/auth/tenant";
import { RoomsManager } from "@/components/rooms/rooms-manager";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const rooms = await getTenantContainer(await requireTenant()).roomService.listRooms();
  return <RoomsManager rooms={rooms} />;
}
