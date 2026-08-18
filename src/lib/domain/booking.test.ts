import { describe, it, expect } from "vitest";
import { bedShortfallNote, bookingDraftSchema, bookingTotal, totalGuests } from "./booking";
import type { BookingDraft, Room } from "./types";

const validDraft = (): BookingDraft => ({
  rooms: [{ roomId: "r1", price: 350 }],
  guests: { adults: 2, children: 1 },
  contacts: [{ name: "Dana Levi", phone: "050-1234567" }],
  checkIn: "2026-08-10",
  checkOut: "2026-08-12",
});

describe("bookingDraftSchema", () => {
  it("accepts a valid draft", () => {
    expect(bookingDraftSchema.safeParse(validDraft()).success).toBe(true);
  });

  it("requires at least one room", () => {
    expect(bookingDraftSchema.safeParse({ ...validDraft(), rooms: [] }).success).toBe(false);
  });

  it("rejects duplicate rooms", () => {
    const draft = {
      ...validDraft(),
      rooms: [{ roomId: "r1", price: 100 }, { roomId: "r1", price: 120 }],
    };
    expect(bookingDraftSchema.safeParse(draft).success).toBe(false);
  });

  it("rejects negative room price", () => {
    const draft = { ...validDraft(), rooms: [{ roomId: "r1", price: -5 }] };
    expect(bookingDraftSchema.safeParse(draft).success).toBe(false);
  });

  it("requires at least one adult", () => {
    expect(
      bookingDraftSchema.safeParse({ ...validDraft(), guests: { adults: 0, children: 2 } }).success,
    ).toBe(false);
  });

  it("rejects negative children count", () => {
    expect(
      bookingDraftSchema.safeParse({ ...validDraft(), guests: { adults: 1, children: -1 } }).success,
    ).toBe(false);
  });

  it("requires at least one contact with name and phone", () => {
    expect(bookingDraftSchema.safeParse({ ...validDraft(), contacts: [] }).success).toBe(false);
    expect(
      bookingDraftSchema.safeParse({ ...validDraft(), contacts: [{ name: "", phone: "050" }] }).success,
    ).toBe(false);
    expect(
      bookingDraftSchema.safeParse({ ...validDraft(), contacts: [{ name: "Dana", phone: "" }] }).success,
    ).toBe(false);
  });

  it("allows optional contact email but validates its format", () => {
    const good = { ...validDraft(), contacts: [{ name: "Dana", phone: "050", email: "a@b.com" }] };
    const bad = { ...validDraft(), contacts: [{ name: "Dana", phone: "050", email: "nope" }] };
    expect(bookingDraftSchema.safeParse(good).success).toBe(true);
    expect(bookingDraftSchema.safeParse(bad).success).toBe(false);
  });

  it("requires checkOut strictly after checkIn", () => {
    expect(
      bookingDraftSchema.safeParse({ ...validDraft(), checkOut: "2026-08-10" }).success,
    ).toBe(false);
  });
});

describe("booking notes", () => {
  it("accepts typed notes", () => {
    const draft = {
      ...validDraft(),
      notes: [
        { type: "info", text: "Arriving late" },
        { type: "notification", text: "Deposit pending" },
        { type: "action-item", text: "Prepare baby cot" },
      ],
    };
    expect(bookingDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("rejects unknown note types and empty text", () => {
    expect(
      bookingDraftSchema.safeParse({ ...validDraft(), notes: [{ type: "warning", text: "x" }] })
        .success,
    ).toBe(false);
    expect(
      bookingDraftSchema.safeParse({ ...validDraft(), notes: [{ type: "info", text: "" }] })
        .success,
    ).toBe(false);
  });

  it("defaults to an empty list", () => {
    expect(bookingDraftSchema.parse(validDraft()).notes).toEqual([]);
  });
});

describe("bedShortfallNote", () => {
  const room = (id: string, beds: Room["beds"]): Room => ({
    id,
    name: `Room ${id}`,
    description: "",
    beds,
    basePrice: 100,
    isActive: true,
    sortOrder: 0,
    externalRefs: {},
  });

  it("returns an action-item note when guests exceed the beds", () => {
    const note = bedShortfallNote(
      { adults: 3, children: 2 },
      [room("r1", { double: 1, single: 1 })], // sleeps 3
    );
    expect(note).not.toBeNull();
    expect(note!.type).toBe("action-item");
    expect(note!.code).toBe("bed-shortfall");
    expect(note!.text).toMatch(/5 guests/);
    expect(note!.text).toMatch(/3/);
  });

  it("returns null when the beds are enough", () => {
    expect(
      bedShortfallNote({ adults: 2, children: 1 }, [room("r1", { double: 1, single: 1 })]),
    ).toBeNull();
    expect(
      bedShortfallNote({ adults: 4, children: 0 }, [
        room("r1", { double: 1, single: 0 }),
        room("r2", { double: 1, single: 0 }),
      ]),
    ).toBeNull();
  });
});

describe("bookingTotal", () => {
  it("sums per-room prices", () => {
    expect(bookingTotal([{ roomId: "r1", price: 350 }, { roomId: "r2", price: 420.5 }])).toBe(770.5);
  });

  it("is zero for no rooms", () => {
    expect(bookingTotal([])).toBe(0);
  });
});

describe("totalGuests", () => {
  it("sums adults and children", () => {
    expect(totalGuests({ adults: 2, children: 3 })).toBe(5);
  });
});
