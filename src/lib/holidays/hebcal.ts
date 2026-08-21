import "server-only";
import type { Holiday } from "@/lib/domain/types";

interface HebcalItem {
  title?: string;
  date?: string;
  category?: string;
}

interface HebcalResponse {
  items?: HebcalItem[];
}

/**
 * Fetches Israeli holidays for a calendar year from the free Hebcal JSON API.
 * Includes major/minor/modern holidays and holiday eves (Hebcal returns "Erev
 * ..." as their own `holiday` items), which is what defines high season. Uses
 * Israel scheduling (`i=on`). Returns one entry per date, deduped.
 */
export const fetchIsraeliHolidays = async (year: number): Promise<Holiday[]> => {
  const url =
    `https://www.hebcal.com/hebcal?cfg=json&v=1&maj=on&min=on&mod=on&i=on` +
    `&year=${year}&month=x`;

  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Hebcal request failed for ${year}: ${res.status}`);
  }

  const data = (await res.json()) as HebcalResponse;
  const byDate = new Map<string, Holiday>();
  for (const item of data.items ?? []) {
    if (item.category !== "holiday" || !item.date || !item.title) continue;
    const date = item.date.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, { date, title: item.title });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};
