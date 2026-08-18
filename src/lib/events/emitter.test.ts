import { describe, it, expect, vi } from "vitest";
import { createEmitter } from "./emitter";
import type { Booking } from "@/lib/domain/types";

const booking = {} as Booking;

describe("createEmitter", () => {
  it("delivers events to subscribed handlers", async () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    emitter.on("booking.created", handler);
    await emitter.emit("booking.created", { booking });
    expect(handler).toHaveBeenCalledWith({ booking });
  });

  it("does not call handlers of other events", async () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    emitter.on("booking.cancelled", handler);
    await emitter.emit("booking.created", { booking });
    expect(handler).not.toHaveBeenCalled();
  });

  it("isolates handler failures so one bad integration cannot break the flow", async () => {
    const emitter = createEmitter();
    const good = vi.fn();
    emitter.on("booking.created", () => {
      throw new Error("boom");
    });
    emitter.on("booking.created", good);
    await expect(emitter.emit("booking.created", { booking })).resolves.toBeUndefined();
    expect(good).toHaveBeenCalled();
  });

  it("supports unsubscribe", async () => {
    const emitter = createEmitter();
    const handler = vi.fn();
    const off = emitter.on("booking.created", handler);
    off();
    await emitter.emit("booking.created", { booking });
    expect(handler).not.toHaveBeenCalled();
  });
});
