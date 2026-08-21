import { emptySeasonConfig } from "@/lib/domain/season";
import type { HighSeasonRange, Holiday, SeasonConfig } from "@/lib/domain/types";
import { fetchIsraeliHolidays } from "@/lib/holidays/hebcal";
import type { SeasonRepository } from "@/lib/repositories/types";

const mergeHolidays = (existing: Holiday[], incoming: Holiday[]): Holiday[] => {
  const byDate = new Map(existing.map((h) => [h.date, h]));
  for (const h of incoming) byDate.set(h.date, h);
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};

/** Drops every holiday whose date falls in the given calendar year. */
const withoutYear = (holidays: Holiday[], year: number): Holiday[] => {
  const prefix = `${year}-`;
  return holidays.filter((h) => !h.date.startsWith(prefix));
};

export function createSeasonService({ seasonRepo }: { seasonRepo: SeasonRepository }) {
  const load = async (): Promise<SeasonConfig> => (await seasonRepo.get()) ?? emptySeasonConfig();

  const importYears = async (years: number[], { force = false } = {}): Promise<SeasonConfig> => {
    const config = await load();
    const todo = force ? years : years.filter((y) => !config.importedYears.includes(y));
    if (todo.length === 0) return config;

    let holidays = config.holidays;
    for (const year of todo) {
      const fetched = await fetchIsraeliHolidays(year);
      // On a forced refresh, replace that year's holidays instead of merging.
      holidays = mergeHolidays(force ? withoutYear(holidays, year) : holidays, fetched);
    }
    const importedYears = [...new Set([...config.importedYears, ...todo])].sort((a, b) => a - b);
    return seasonRepo.set({ ...config, holidays, importedYears });
  };

  return {
    async getSeason(): Promise<SeasonConfig> {
      return load();
    },

    /** Imports any of `years` not already imported (used for lazy yearly refresh). */
    async ensureYears(years: number[]): Promise<SeasonConfig> {
      return importYears(years);
    },

    /** Force re-fetches the given years from Hebcal, replacing their holidays. */
    async importYears(years: number[]): Promise<SeasonConfig> {
      return importYears(years, { force: true });
    },

    async saveManualRanges(manualRanges: HighSeasonRange[]): Promise<SeasonConfig> {
      const config = await load();
      return seasonRepo.set({ ...config, manualRanges });
    },
  };
}

export type SeasonService = ReturnType<typeof createSeasonService>;
