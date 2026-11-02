"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { MODULES } from "@/features/modules/registry";
import { ModulePanel } from "@/features/crud/ModulePanel";
import { AccessDenied } from "@/features/crud/ModulePage";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Tabs } from "@/components/ui/feedback";
import { Card, CardContent } from "@/components/ui/primitives";
import type { Capability } from "@/lib/permissions";

export default function TransportPage() {
  const { t, locale } = useI18n();
  const { can } = useAuth();
  const [tab, setTab] = useState("transportRoutes");

  if (!can("transport.view" as Capability)) return <AccessDenied capability="transport.view" />;

  return (
    <>
      <DashboardPageHeader title={t("nav.transport")} />
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "transportRoutes", label: locale === "bn" ? "রুট" : "Routes" },
          { id: "vehicles", label: locale === "bn" ? "যানবাহন" : "Vehicles" },
        ]}
        className="max-w-sm"
      />
      <div className="mt-4">
        <ModulePanel key={tab} module={MODULES[tab]} />
      </div>
      <Card className="mt-4 border-slate-200 bg-soft">
        <CardContent className="text-xs leading-relaxed text-slate-600">
          {locale === "bn"
            ? "এই মডিউলে রুট, স্টপ, যান ও চালকের তথ্য এবং মাসিক পরিবহন ফি রাখা হয়। কোনো জিপিএস ট্র্যাকিং বা লাইভ ভেহিকল ইন্টিগ্রেশন যুক্ত নেই।"
            : "This module records routes, stops, vehicles, drivers and the monthly transport fee. No GPS tracking or live vehicle integration is provided."}
        </CardContent>
      </Card>
    </>
  );
}
