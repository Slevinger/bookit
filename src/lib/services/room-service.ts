import type { z } from "zod";
import { roomDraftSchema } from "@/lib/domain/room";
import type { Room } from "@/lib/domain/types";
import type { RoomRepository } from "@/lib/repositories/types";

export type RoomInput = z.input<typeof roomDraftSchema>;

export function createRoomService({ roomRepo }: { roomRepo: RoomRepository }) {
  return {
    async listRooms(): Promise<Room[]> {
      return roomRepo.list();
    },

    async getRoom(id: string): Promise<Room | null> {
      return roomRepo.get(id);
    },

    async createRoom(input: RoomInput): Promise<Room> {
      const parsed = roomDraftSchema.parse(input);
      const existing = await roomRepo.list();
      const sortOrder = existing.length
        ? Math.max(...existing.map((r) => r.sortOrder)) + 1
        : 0;
      return roomRepo.create({ ...parsed, sortOrder, externalRefs: {} });
    },

    async updateRoom(id: string, patch: Partial<RoomInput> & { sortOrder?: number }): Promise<Room> {
      const parsed = roomDraftSchema.partial().parse(patch);
      return roomRepo.update(id, parsed);
    },
  };
}

export type RoomService = ReturnType<typeof createRoomService>;
