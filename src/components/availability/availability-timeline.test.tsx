import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AvailabilityTimeline } from "./availability-timeline";
import type { Booking, Room, RoomAvailability } from "@/lib/domain/types";

const room = (id: string, name: string): Room => ({
  id, name, description: "", beds: { double: 1, single: 0 }, basePrice: 350, isActive: true, sortOrder: 0, externalRefs: {},
});

const conflict: Booking = {
  id: "bX",
  rooms: [{ roomId: "r1", price: 100 }],
  guests: { adults: 2, children: 0 },
  contacts: [{ name: "Someone Else", phone: "052" }],
  checkIn: "2026-08-09",
  checkOut: "2026-08-11",
  status: "confirmed",  notes: [],
  source: "manual",
  createdAt: "",
};

const result: RoomAvailability[] = [
  { room: room("r1", "Garden"), available: false, conflicts: [conflict] },
  { room: room("r2", "Loft"), available: true, conflicts: [] },
];

describe("AvailabilityTimeline", () => {
  it("renders a row per room with availability status", () => {
    render(<AvailabilityTimeline result={result} checkIn="2026-08-10" checkOut="2026-08-12" onBook={vi.fn()} />);
    expect(screen.getByText("Garden")).toBeInTheDocument();
    expect(screen.getByText("Loft")).toBeInTheDocument();
    expect(screen.getByTestId("row-r1")).toHaveAttribute("data-available", "false");
    expect(screen.getByTestId("row-r2")).toHaveAttribute("data-available", "true");
  });

  it("shows the proposed range band and conflict blocks", () => {
    render(<AvailabilityTimeline result={result} checkIn="2026-08-10" checkOut="2026-08-12" onBook={vi.fn()} />);
    expect(screen.getAllByTestId("proposed-band").length).toBeGreaterThan(0);
    expect(screen.getByTestId("conflict-bX-r1")).toBeInTheDocument();
  });

  it("books an available room with one click", async () => {
    const onBook = vi.fn();
    const user = userEvent.setup();
    render(<AvailabilityTimeline result={result} checkIn="2026-08-10" checkOut="2026-08-12" onBook={onBook} />);
    await user.click(screen.getByRole("button", { name: /book loft/i }));
    expect(onBook).toHaveBeenCalledWith(["r2"]);
  });

  it("does not offer booking for unavailable rooms", () => {
    render(<AvailabilityTimeline result={result} checkIn="2026-08-10" checkOut="2026-08-12" onBook={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /book garden/i })).not.toBeInTheDocument();
  });
});
