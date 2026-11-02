"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import bnMessages from "@/messages/bn.json";
import enMessages from "@/messages/en.json";
import type { Locale } from "@/types";

/**
 * Bilingual UI (bn / en).
 *
 * Keys are flat dot-paths so a missing key falls back deterministically:
 * requested locale -> English -> the key itself (never a blank string).
 * The preferred locale is persisted locally for visitors and on the signed-in
 * user's profile (`preferredLanguage`) for staff, students and parents.
 */

const dictionaries: Record<Locale, Record<string, string>> = {
  bn: bnMessages as Record<string, string>,
  en: enMessages as Record<string, string>,
};

export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: "bn", label: "বাংলা", short: "বাং" },
  { code: "en", label: "English", short: "EN" },
];

const STORAGE_KEY = "tazdeed.locale";

export function defaultLocale(): Locale {
  const configured = (process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "bn") as Locale;
  return configured === "en" ? "en" : "bn";
}

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const raw = dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_match, name: string) =>
    String(vars[name] ?? `{${name}}`),
  );
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Localised name for a bilingual record: {bn, en}. */
  tl: (value: { bn?: string; en?: string } | undefined) => string;
  dir: "ltr";
  formatDate: (value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? defaultLocale());

  // Restore the visitor's preference once, on the client.
  useEffect(() => {
    // Restoring a persisted preference is intentionally post-hydration: it keeps
    // the server-rendered markup and the first client paint identical.
    queueMicrotask(() => {
      if (initialLocale) {
        setLocaleState(initialLocale);
        return;
      }
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
        if (stored === "bn" || stored === "en") setLocaleState(stored);
      } catch {
        /* private mode — keep the default */
      }
    });
  }, [initialLocale]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);
    return {
      locale,
      setLocale,
      t,
      tl: (bilingual) => {
        if (!bilingual) return "";
        return locale === "bn"
          ? bilingual.bn || bilingual.en || ""
          : bilingual.en || bilingual.bn || "";
      },
      dir: "ltr",
      formatDate: (input, options) => {
        if (!input) return "—";
        const date = typeof input === "string" ? new Date(input) : input;
        if (Number.isNaN(date.getTime())) return String(input);
        try {
          return new Intl.DateTimeFormat(
            locale === "bn" ? "bn-BD" : "en-GB",
            options ?? { year: "numeric", month: "short", day: "numeric" },
          ).format(date);
        } catch {
          return date.toISOString().slice(0, 10);
        }
      },
      formatNumber: (input) => {
        try {
          return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US").format(input);
        } catch {
          return String(input);
        }
      },
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) {
    // Safe fallback so server-rendered shells never crash during static export.
    return {
      locale: defaultLocale(),
      setLocale: () => undefined,
      t: (key: string) => translate("en", key),
      tl: (value) => value?.en || value?.bn || "",
      dir: "ltr",
      formatDate: (value) => (value ? String(value) : "—"),
      formatNumber: (value) => String(value),
    };
  }
  return context;
}
