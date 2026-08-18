import type { Booking } from "@/lib/domain/types";

export interface DomainEvents {
  "booking.created": { booking: Booking };
  "booking.updated": { booking: Booking; previous: Booking };
  "booking.cancelled": { booking: Booking };
}

export type EventName = keyof DomainEvents;
type Handler<E extends EventName> = (payload: DomainEvents[E]) => void | Promise<void>;

export interface Emitter {
  on<E extends EventName>(event: E, handler: Handler<E>): () => void;
  emit<E extends EventName>(event: E, payload: DomainEvents[E]): Promise<void>;
}

/**
 * In-process domain event bus. Future integrations (email confirmations,
 * iCal/OTA sync, payments) subscribe here without touching booking logic.
 * Handler failures are isolated so integrations can never break core flows.
 */
export const createEmitter = (): Emitter => {
  const handlers = new Map<EventName, Set<Handler<EventName>>>();

  return {
    on(event, handler) {
      const set = handlers.get(event) ?? new Set();
      set.add(handler as Handler<EventName>);
      handlers.set(event, set);
      return () => set.delete(handler as Handler<EventName>);
    },
    async emit(event, payload) {
      const set = handlers.get(event);
      if (!set) return;
      await Promise.all(
        [...set].map(async (handler) => {
          try {
            await handler(payload);
          } catch (error) {
            console.error(`[events] handler for ${event} failed:`, error);
          }
        }),
      );
    },
  };
};

export const emitter: Emitter = createEmitter();
