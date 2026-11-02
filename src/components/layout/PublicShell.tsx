"use client";

import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useSchool } from "@/features/settings/SchoolProvider";
import { useI18n } from "@/lib/i18n";

/** Thin, honest banner shown while no Firebase project is connected. */
export function DemoBanner() {
  const { mode } = useSchool();
  const { t } = useI18n();
  if (mode !== "local") return null;
  return (
    <div className="no-print border-b border-amber-200 bg-amber-50 text-amber-900">
      <div className="mx-auto flex w-full max-w-7xl items-start gap-2 px-4 py-2 text-xs sm:px-6 lg:px-8">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p className="leading-relaxed">
          <span className="font-semibold">{t("common.demoMode")}:</span> {t("common.demoModeBody")}
        </p>
      </div>
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-navy-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {t("nav.home")}
      </a>
      <DemoBanner />
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
