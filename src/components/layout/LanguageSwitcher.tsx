"use client";

import { Globe } from "lucide-react";
import { LOCALES, useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/types";

export function LanguageSwitcher({ className, variant = "button" }: { className?: string; variant?: "button" | "select" }) {
  const { locale, setLocale, t } = useI18n();

  if (variant === "select") {
    return (
      <label className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-slate-600", className)}>
        <Globe className="size-4" aria-hidden="true" />
        <span className="sr-only">{t("nav.language")}</span>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 focus:border-royal-500 focus:outline-none"
        >
          {LOCALES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className={cn("inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5", className)}
    >
      {LOCALES.map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => setLocale(option.code)}
          aria-pressed={locale === option.code}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            locale === option.code ? "bg-navy-600 text-white" : "text-slate-600 hover:bg-slate-100",
          )}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}
