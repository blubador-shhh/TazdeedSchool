"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { MODULES } from "@/features/modules/registry";
import { ModulePanel } from "@/features/crud/ModulePanel";
import { AccessDenied } from "@/features/crud/ModulePage";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Tabs } from "@/components/ui/feedback";
import type { Capability } from "@/lib/permissions";

const TABS = [
  { id: "academicSessions", label: { bn: "শিক্ষাবর্ষ", en: "Sessions" } },
  { id: "classes", label: { bn: "শ্রেণি", en: "Classes" } },
  { id: "sections", label: { bn: "শাখা", en: "Sections" } },
  { id: "subjects", label: { bn: "বিষয়", en: "Subjects" } },
] as const;

export default function AcademicsPage() {
  const { t, locale, tl } = useI18n();
  const { can } = useAuth();
  const [tab, setTab] = useState<string>("academicSessions");

  if (!can("academics.view" as Capability)) return <AccessDenied capability="academics.view" />;

  const definition = MODULES[tab];

  return (
    <>
      <DashboardPageHeader
        title={t("nav.academics")}
        description={
          locale === "bn"
            ? "শিক্ষাবর্ষ, শ্রেণি, শাখা ও বিষয় কনফিগার করুন। প্রমোশনের সময় পুরনো শিক্ষাবর্ষের রেকর্ড সংরক্ষিত থাকে।"
            : "Configure sessions, classes, sections and subjects. Historical sessions keep their enrolments and results intact."
        }
      />
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={TABS.map((item) => ({ id: item.id, label: locale === "bn" ? item.label.bn : item.label.en }))}
        className="max-w-xl"
      />
      <div className="mt-4">
        <ModulePanel key={definition.id} module={definition} />
      </div>
      <p className="mt-3 text-xs text-slate-400">{tl(definition.description ?? { bn: "", en: "" })}</p>
    </>
  );
}
