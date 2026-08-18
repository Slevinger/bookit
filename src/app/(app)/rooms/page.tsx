import { getContainer } from "@/lib/container";
import { RoomsManager } from "@/components/rooms/rooms-manager";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const rooms = await getContainer().roomService.listRooms();
  return <RoomsManager rooms={rooms} />;
}
