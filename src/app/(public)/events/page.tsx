"use client";

import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCollection } from "@/hooks/useCollection";
import { todayKey } from "@/lib/utils/date";
import { Card } from "@/components/ui/primitives";
import { EmptyState, LoadingBlock, Tabs } from "@/components/ui/feedback";
import { EventCard, PageHero, Section } from "@/components/public/Cards";
import type { SchoolEvent } from "@/types";

export default function EventsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"upcoming" | "archive">("upcoming");
  const today = todayKey();

  const { rows, loading } = useCollection<SchoolEvent>("events", {
    where: [["publicationStatus", "==", "published"]],
    orderBy: [["eventDate", "asc"]],
    limit: 80,
  });

  const upcoming = useMemo(() => rows.filter((event) => event.eventDate >= today), [rows, today]);
  const archive = useMemo(
    () => rows.filter((event) => event.eventDate < today).sort((a, b) => (a.eventDate < b.eventDate ? 1 : -1)),
    [rows, today],
  );
  const visible = tab === "upcoming" ? upcoming : archive;

  return (
    <>
      <PageHero eyebrow={t("nav.events")} title={t("events.title")} subtitle={t("home.eventsTitle")} />
      <Section className="bg-white">
        <Tabs
          active={tab}
          onChange={(id) => setTab(id as "upcoming" | "archive")}
          tabs={[
            { id: "upcoming", label: t("events.upcoming"), count: upcoming.length },
            { id: "archive", label: t("events.archive"), count: archive.length },
          ]}
          className="max-w-md"
        />
        <div className="mt-6">
          {loading ? (
            <LoadingBlock label={t("common.loading")} />
          ) : visible.length === 0 ? (
            <Card><EmptyState icon={<CalendarDays className="size-6" />} title={t("home.eventsEmpty")} /></Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
