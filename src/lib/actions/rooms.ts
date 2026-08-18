"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getContainer } from "@/lib/container";
import type { RoomInput } from "@/lib/services/room-service";
import type { Room } from "@/lib/domain/types";
import type { ActionResult } from "./bookings";

function toError(error: unknown): string {
  if (error instanceof ZodError) return error.issues.map((i) => i.message).join(". ");
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function createRoomAction(input: RoomInput): Promise<ActionResult<Room>> {
  try {
    const room = await getContainer().roomService.createRoom(input);
    revalidatePath("/rooms");
    revalidatePath("/");
    return { ok: true, data: room };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

export async function updateRoomAction(
  id: string,
  patch: Partial<RoomInput>,
): Promise<ActionResult<Room>> {
  try {
    const room = await getContainer().roomService.updateRoom(id, patch);
    revalidatePath("/rooms");
    revalidatePath("/");
    return { ok: true, data: room };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
