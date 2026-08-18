import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { BookingForm } from "./booking-form";
import type { Room, RoomAvailability } from "@/lib/domain/types";

const rooms: Room[] = [
  { id: "r1", name: "Garden", description: "", beds: { double: 1, single: 0 }, basePrice: 350, isActive: true, sortOrder: 0, externalRefs: {} },
  { id: "r2", name: "Loft", description: "", beds: { double: 2, single: 0 }, basePrice: 500, isActive: true, sortOrder: 1, externalRefs: {} },
];

const allAvailable = async (): Promise<RoomAvailability[]> =>
  rooms.map((room) => ({ room, available: true, conflicts: [] }));

function setup(overrides: Partial<React.ComponentProps<typeof BookingForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue({ ok: true });
  const utils = render(
    <BookingForm
      rooms={rooms}
      checkAvailability={allAvailable}
      onSubmit={onSubmit}
      initial={{ checkIn: "2026-08-10", checkOut: "2026-08-12", roomIds: ["r1"] }}
      {...overrides}
    />,
  );
  return { onSubmit, ...utils };
}

const next = (user: UserEvent) => user.click(screen.getByRole("button", { name: /next/i }));

/** Steps: 1 dates, 2 guests, 3 rooms, 4 contact, 5 confirm. */
async function goToRoomsStep(user: UserEvent) {
  await next(user); // dates -> guests
  await next(user); // guests -> rooms
}

describe("BookingForm wizard", () => {
  it("walks step by step: dates first, guests second", async () => {
    const user = userEvent.setup();
    setup();
    expect(screen.getByLabelText(/check-in/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/adults/i)).not.toBeInTheDocument();
    await next(user);
    expect(screen.getByText(/step 2/i)).toBeInTheDocument();
  });

  it("assigns check-out automatically from the number of nights", async () => {
    const user = userEvent.setup();
    setup();
    // 2026-08-10 + 2 nights = 2026-08-12; one more night moves check-out to the 13th.
    await user.click(screen.getByRole("button", { name: /increase nights/i }));
    expect(screen.getByLabelText(/check-out/i)).toHaveValue("2026-08-13");
  });

  it("keeps the stay length when check-in moves", async () => {
    const user = userEvent.setup();
    setup();
    const checkIn = screen.getByLabelText(/check-in/i);
    await user.clear(checkIn);
    await user.type(checkIn, "2026-08-20");
    expect(screen.getByLabelText(/check-out/i)).toHaveValue("2026-08-22");
  });

  it("blocks the dates step when the range is invalid", async () => {
    const user = userEvent.setup();
    setup({ initial: { checkIn: "2026-08-12", checkOut: "2026-08-10" } });
    await next(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/check-out/i);
    expect(screen.queryByText(/step 2/i)).not.toBeInTheDocument();
  });

  it("pre-fills room price from basePrice and shows the total on the rooms step", async () => {
    const user = userEvent.setup();
    setup();
    await goToRoomsStep(user);
    const price = await screen.findByLabelText(/price.*garden/i);
    expect(price).toHaveValue(700); // 350 x 2 nights
    expect(screen.getByTestId("booking-total")).toHaveTextContent("700");
  });

  it("updates total when adding a second room", async () => {
    const user = userEvent.setup();
    setup();
    await goToRoomsStep(user);
    await screen.findByLabelText(/price.*garden/i);
    await user.click(screen.getByRole("button", { name: /loft/i }));
    expect(screen.getByTestId("booking-total")).toHaveTextContent("1,700"); // 700 + 500x2
  });

  it("submits a full draft from the confirm step", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await goToRoomsStep(user);
    await screen.findByLabelText(/price.*garden/i);
    await next(user); // rooms -> contact
    await user.type(screen.getByLabelText(/contact name/i), "Dana Levi");
    await user.type(screen.getByLabelText(/phone/i), "050-1234567");
    await next(user); // contact -> confirm
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    const draft = onSubmit.mock.calls[0][0];
    expect(draft).toMatchObject({
      checkIn: "2026-08-10",
      checkOut: "2026-08-12",
      rooms: [{ roomId: "r1", price: 700 }],
      guests: { adults: 2, children: 0 },
      contacts: [expect.objectContaining({ name: "Dana Levi", phone: "050-1234567" })],
    });
  });

  it("blocks the contact step when name or phone is missing", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await goToRoomsStep(user);
    await screen.findByLabelText(/price.*garden/i);
    await next(user); // rooms -> contact
    await next(user); // attempt contact -> confirm with empty contact

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent(/name and phone/i);
  });

  it("blocks the rooms step when no room is selected", async () => {
    const user = userEvent.setup();
    setup({ initial: { checkIn: "2026-08-10", checkOut: "2026-08-12" } });
    await goToRoomsStep(user);
    await next(user);
    expect(await screen.findByRole("alert")).toHaveTextContent(/select at least one room/i);
  });

  it("shows a conflict warning when a selected room is unavailable", async () => {
    const user = userEvent.setup();
    const conflicted = async (): Promise<RoomAvailability[]> => [
      {
        room: rooms[0],
        available: false,
        conflicts: [
          {
            id: "bX",
            rooms: [{ roomId: "r1", price: 100 }],
            guests: { adults: 2, children: 0 },
            contacts: [{ name: "Someone", phone: "052" }],
            checkIn: "2026-08-09",
            checkOut: "2026-08-11",
            status: "confirmed",            notes: [],
            source: "manual",
            createdAt: "",
          },
        ],
      },
      { room: rooms[1], available: true, conflicts: [] },
    ];
    setup({ checkAvailability: conflicted });
    await goToRoomsStep(user);
    expect(await screen.findByText(/not available/i)).toBeInTheDocument();
  });
});
