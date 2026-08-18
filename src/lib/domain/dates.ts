import type { ISODate } from "./types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isISODate = (value: string): boolean => {
  if (!ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

/**
 * Half-open interval semantics [checkIn, checkOut): a guest checking out on a
 * given day does not collide with a guest checking in the same day.
 */
export const rangesOverlap = (
  aStart: ISODate,
  aEnd: ISODate,
  bStart: ISODate,
  bEnd: ISODate,
): boolean => aStart < bEnd && bStart < aEnd;

const MS_PER_DAY = 86_400_000;

const toUTC = (date: ISODate): number => new Date(`${date}T00:00:00Z`).getTime();

export const nightsBetween = (checkIn: ISODate, checkOut: ISODate): number =>
  Math.round((toUTC(checkOut) - toUTC(checkIn)) / MS_PER_DAY);

export const addDays = (date: ISODate, days: number): ISODate =>
  new Date(toUTC(date) + days * MS_PER_DAY).toISOString().slice(0, 10);

/** Each date from start (inclusive) to end (exclusive). */
export const eachDateInRange = (start: ISODate, end: ISODate): ISODate[] => {
  const days = nightsBetween(start, end);
  return Array.from({ length: Math.max(0, days) }, (_, i) => addDays(start, i));
};

export const isValidRange = (checkIn: string, checkOut: string): boolean =>
  isISODate(checkIn) && isISODate(checkOut) && checkIn < checkOut;

export const todayISO = (): ISODate => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

/** Resolves a YYYY-MM string (falling back to the current month) to its date window. */
export const monthWindow = (month?: string): { from: ISODate; to: ISODate; month: string } => {
  const valid = month && /^\d{4}-\d{2}$/.test(month) ? month : todayISO().slice(0, 7);
  const [y, m] = valid.split("-").map(Number);
  const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { from: `${valid}-01`, to: `${nextMonth}-01`, month: valid };
};
