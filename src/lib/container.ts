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

const TENANTS = "tenants";
const ROOMS = "rooms";
const BOOKINGS = "bookings";

const containers = new Map<string, Container>();

/**
 * Composition root, scoped per tenant. Data lives under
 * `tenants/{tenantId}/rooms` and `tenants/{tenantId}/bookings`, so every tenant
 * is fully isolated. Containers are memoized per tenant for the instance.
 */
export function getTenantContainer(tenantId: string): Container {
  const existing = containers.get(tenantId);
  if (existing) return existing;

  const db = getDb();
  const tenantDoc = db.collection(TENANTS).doc(tenantId);
  const bookingRepo = createFirestoreBookingRepository(tenantDoc.collection(BOOKINGS));
  const roomRepo = createFirestoreRoomRepository(tenantDoc.collection(ROOMS));
  const container: Container = {
    bookingService: createBookingService({ bookingRepo, roomRepo, emitter }),
    roomService: createRoomService({ roomRepo }),
  };
  containers.set(tenantId, container);
  return container;
}
