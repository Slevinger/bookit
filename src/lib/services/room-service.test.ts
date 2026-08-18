import { describe, it, expect } from "vitest";
import { createRoomService } from "./room-service";
import { createInMemoryRepos } from "@/lib/repositories/in-memory";

function setup() {
  const { roomRepo } = createInMemoryRepos();
  return { service: createRoomService({ roomRepo }), roomRepo };
}

describe("room service", () => {
  it("creates a room with defaults and appends to sort order", async () => {
    const { service } = setup();
    const a = await service.createRoom({ name: "Garden", beds: { double: 1, single: 0 }, basePrice: 350 });
    const b = await service.createRoom({ name: "Loft", beds: { double: 2, single: 0 }, basePrice: 500 });

    expect(a.isActive).toBe(true);
    expect(b.sortOrder).toBeGreaterThan(a.sortOrder);
  });

  it("rejects empty name, rooms without beds, negative price", async () => {
    const { service } = setup();
    await expect(service.createRoom({ name: " ", beds: { double: 1, single: 0 }, basePrice: 100 })).rejects.toThrow();
    await expect(service.createRoom({ name: "X", beds: { double: 0, single: 0 }, basePrice: 100 })).rejects.toThrow();
    await expect(service.createRoom({ name: "X", beds: { double: 1, single: 0 }, basePrice: -1 })).rejects.toThrow();
  });

  it("updates a room", async () => {
    const { service } = setup();
    const room = await service.createRoom({ name: "Garden", beds: { double: 1, single: 0 }, basePrice: 350 });
    const updated = await service.updateRoom(room.id, { basePrice: 400, isActive: false });
    expect(updated.basePrice).toBe(400);
    expect(updated.isActive).toBe(false);
  });

  it("lists rooms sorted", async () => {
    const { service } = setup();
    await service.createRoom({ name: "A", beds: { double: 1, single: 0 }, basePrice: 100 });
    await service.createRoom({ name: "B", beds: { double: 1, single: 0 }, basePrice: 100 });
    const list = await service.listRooms();
    expect(list.map((r) => r.name)).toEqual(["A", "B"]);
  });
});
