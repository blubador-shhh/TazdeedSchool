"use client";

import { ShieldAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Capability } from "@/lib/permissions";
import { MODULES } from "@/features/modules/registry";
import { ModulePanel, type ModulePanelProps } from "@/features/crud/ModulePanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/feedback";
import type { WhereClause } from "@/lib/data/store";

export function AccessDenied({ capability }: { capability?: string }) {
  const { t, locale } = useI18n();
  return (
    <div className="grid place-items-center rounded-card border border-slate-200 bg-white px-6 py-16 text-center shadow-card">
      <ShieldAlert className="size-10 text-amber-500" />
      <h2 className="mt-4 text-base font-semibold text-slate-900">{t("error.permission")}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        {locale === "bn"
          ? "এই অংশটি আপনার ভূমিকার জন্য উন্মুক্ত নয়। Cloud Firestore নিরাপত্তা নিয়ম এই অনুরোধ প্রত্যাখ্যান করবে।"
          : "This area is not open to your role. Cloud Firestore Security Rules would reject the request as well."}
        {capability ? <span className="mt-1 block font-mono text-xs text-slate-400">{capability}</span> : null}
      </p>
      <a href="/dashboard/" className="mt-4">
        <Button variant="outline" size="sm">{t("nav.overview")}</Button>
      </a>
    </div>
  );
}

export interface ModulePageProps extends Omit<ModulePanelProps, "module"> {
  moduleId: string;
  extraWhere?: WhereClause[];
}

/** Page wrapper: capability guard + header + generic CRUD panel. */
export function ModulePage({ moduleId, extraWhere, detailExtra, toolbarExtra, hideCreate, refreshKey }: ModulePageProps) {
  const { t, tl } = useI18n();
  const { can } = useAuth();
  const definition = MODULES[moduleId];

  if (!definition) {
    return <ErrorState message={`Unknown module: ${moduleId}`} />;
  }
  if (!can(definition.capability as Capability)) {
    return <AccessDenied capability={definition.capability} />;
  }

  return (
    <>
      <DashboardPageHeader title={tl(definition.title)} description={definition.description ? tl(definition.description) : undefined} />
      <ModulePanel
        module={definition}
        extraWhere={extraWhere}
        detailExtra={detailExtra}
        toolbarExtra={toolbarExtra}
        hideCreate={hideCreate}
        refreshKey={refreshKey}
      />
      <p className="no-print mt-3 text-xs text-slate-400">{t("results.publishedOnly")}</p>
    </>
  );
}
