import { dictionaries, type Locale, type TranslationKey } from "./dictionaries";
import type { Beds, BookingNote } from "@/lib/domain/types";

export type Params = Record<string, string | number>;

export interface Translator {
  locale: Locale;
  /** BCP-47 tag for date formatting. */
  dateLocale: string;
  t: (key: TranslationKey, params?: Params) => string;
  /** Count-aware translation: uses the `_one` variant when n === 1. */
  tn: (key: TranslationKey, n: number, params?: Params) => string;
  /** One line per bed type, always including both types (e.g. ["1 double", "0 singles"]). */
  bedParts: (beds: Beds) => string[];
  formatBeds: (beds: Beds) => string;
  noteText: (note: BookingNote) => string;
  translateError: (message: string) => string;
}

const interpolate = (template: string, params?: Params): string =>
  template.replace(/\{(\w+)\}/g, (_, name) => String(params?.[name] ?? `{${name}}`));

/** Pure translation core, usable from both server and client components. */
export const createTranslator = (locale: Locale): Translator => {
  const dict = dictionaries[locale];
  const t = (key: TranslationKey, params?: Params) =>
    interpolate(dict[key] ?? dictionaries.en[key] ?? key, params);
  const tn = (key: TranslationKey, n: number, params?: Params) => {
    const oneKey = `${key}_one` as TranslationKey;
    if (n === 1 && dict[oneKey]) return interpolate(dict[oneKey], { n, ...params });
    return t(key, { n, ...params });
  };
  const bedParts = (beds: Beds) => [
    tn("beds.double", beds.double),
    tn("beds.single", beds.single),
  ];
  return {
    locale,
    dateLocale: locale === "he" ? "he-IL" : "en-GB",
    t,
    tn,
    bedParts,
    formatBeds: (beds) => bedParts(beds).join(", "),
    noteText: (note) => {
      // Auto-generated notes carry a code + data so they can be localized.
      if (note.code === "bed-shortfall" && note.data) return t("notes.bedShortfall", note.data);
      return note.text;
    },
    translateError: (message) => {
      if (/no longer available|unavailable for the selected dates/i.test(message)) {
        return t("error.conflict");
      }
      return message;
    },
  };
};
