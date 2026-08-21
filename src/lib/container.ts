import "server-only";
import { getDb } from "@/lib/firestore/client";
import { createEmitter } from "@/lib/events/emitter";
import {
  createFirestoreBookingRepository,
  createFirestoreRoomRepository,
  createFirestoreSeasonRepository,
  createFirestoreTariffRepository,
} from "@/lib/repositories/firestore";
import { createBookingService, type BookingService } from "@/lib/services/booking-service";
import { createRoomService, type RoomService } from "@/lib/services/room-service";
import { createTariffService, type TariffService } from "@/lib/services/tariff-service";
import { createSeasonService, type SeasonService } from "@/lib/services/season-service";
import { registerCalendarSync } from "@/lib/google/sync-subscriber";

interface Container {
  bookingService: BookingService;
  roomService: RoomService;
  tariffService: TariffService;
  seasonService: SeasonService;
}

const TENANTS = "tenants";
const ROOMS = "rooms";
const BOOKINGS = "bookings";
const CONFIG = "config";
const TARIFF_DOC = "tariff";
const SEASON_DOC = "season";

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
  const tariffRepo = createFirestoreTariffRepository(tenantDoc.collection(CONFIG).doc(TARIFF_DOC));
  const seasonRepo = createFirestoreSeasonRepository(tenantDoc.collection(CONFIG).doc(SEASON_DOC));
  // A per-tenant emitter keeps sync handlers scoped to this tenant's data, so a
  // booking event never fans out to another tenant's Google Calendar.
  const emitter = createEmitter();
  registerCalendarSync({ tenantId, emitter, roomRepo });
  const container: Container = {
    bookingService: createBookingService({ bookingRepo, roomRepo, emitter }),
    roomService: createRoomService({ roomRepo }),
    tariffService: createTariffService({ tariffRepo }),
    seasonService: createSeasonService({ seasonRepo }),
  };
  containers.set(tenantId, container);
  return container;
}
