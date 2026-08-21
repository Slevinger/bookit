import type { ISODate, SeasonConfig } from "./types";

export const emptySeasonConfig = (): SeasonConfig => ({
  holidays: [],
  manualRanges: [],
  importedYears: [],
});

/**
 * A date is high season when it is an imported holiday date or falls inside any
 * manual range (both range ends inclusive). Dates are ISO `YYYY-MM-DD`, so plain
 * string comparison is correct and timezone-safe.
 */
export const isHighSeason = (date: ISODate, config?: SeasonConfig | null): boolean => {
  if (!config) return false;
  if (config.holidays.some((h) => h.date === date)) return true;
  return config.manualRanges.some((r) => date >= r.from && date <= r.to);
};
