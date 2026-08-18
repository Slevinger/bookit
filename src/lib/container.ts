import "server-only";
import { getDb } from "@/lib/firestore/client";
import { emitter } from "@/lib/events/emitter";
import {
  createFirestoreBookingRepository,
  createFirestoreRoomRepository,
} from "@/lib/repositories/firestore";
import { createBookingService, type BookingService } from "@/lib/services/booking-service";
import { createRoomService, type RoomService } from "@/lib/services/room-service";

interface Container {
  bookingService: BookingService;
  roomService: RoomService;
}

let container: Container | undefined;

/** Composition root: single place where real infrastructure is wired up. */
export function getContainer(): Container {
  if (!container) {
    const db = getDb();
    const bookingRepo = createFirestoreBookingRepository(db);
    const roomRepo = createFirestoreRoomRepository(db);
    container = {
      bookingService: createBookingService({ bookingRepo, roomRepo, emitter }),
      roomService: createRoomService({ roomRepo }),
    };
  }
  return container;
}
