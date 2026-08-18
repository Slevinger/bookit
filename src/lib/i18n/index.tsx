"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./dictionaries";
import { createTranslator, type Translator } from "./translate";

export interface I18n extends Translator {
  switchLocale: () => void;
}

const I18nContext = createContext<I18n>({
  ...createTranslator("en"),
  switchLocale: () => {},
});

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<I18n>(
    () => ({
      ...createTranslator(locale),
      switchLocale: () => {
        const next: Locale = locale === "he" ? "en" : "he";
        document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=${60 * 60 * 24 * 365}`;
        window.location.reload();
      },
    }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = (): I18n => useContext(I18nContext);

export { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale };
