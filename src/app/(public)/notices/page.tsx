"use client";

import { useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCollection } from "@/hooks/useCollection";
import { Card } from "@/components/ui/primitives";
import { EmptyState, LoadingBlock, Pagination, SearchInput, SelectFilter } from "@/components/ui/feedback";
import { NoticeCard, PageHero, Section } from "@/components/public/Cards";
import type { Notice } from "@/types";

const PAGE_SIZE = 6;

export default function NoticesPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  const { rows, loading, error, reload } = useCollection<Notice>("notices", {
    where: [["publicationStatus", "==", "published"], ["visibility", "==", "public"]],
    orderBy: [["publishedAt", "desc"]],
    limit: 60,
  });

  const categories = useMemo(
    () => Array.from(new Set(rows.map((notice) => notice.category).filter(Boolean))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((notice) => {
      if (category !== "all" && notice.category !== category) return false;
      if (!needle) return true;
      return [notice.titleBn, notice.titleEn, notice.descriptionBn, notice.descriptionEn]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, search, category]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHero eyebrow={t("nav.notices")} title={t("notices.title")} subtitle={t("home.noticesConfig")} />
      <Section className="bg-white">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={t("common.searchPlaceholder")} className="w-full sm:w-72" />
          <SelectFilter
            value={category}
            onChange={(value) => { setCategory(value); setPage(1); }}
            label={t("common.filter")}
            options={[{ value: "all", label: t("common.all") }, ...categories.map((item) => ({ value: item, label: item }))]}
          />
          <span className="ml-auto text-xs text-slate-500">{filtered.length} {t("common.results")}</span>
        </div>

        <div className="mt-6">
          {loading ? (
            <LoadingBlock label={t("common.loading")} />
          ) : error ? (
            <Card><EmptyState title={t("error.title")} body={error} /></Card>
          ) : pageRows.length === 0 ? (
            <Card>
              <EmptyState icon={<Megaphone className="size-6" />} title={t("home.noticesEmpty")} body={error ?? undefined} action={error ? <button type="button" className="text-sm font-semibold text-royal-700 hover:underline" onClick={reload}>{t("common.retry")}</button> : undefined} />
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {pageRows.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} detailed />
              ))}
            </div>
          )}
        </div>

        {filtered.length > PAGE_SIZE ? (
          <div className="mt-6">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onPageChange={setPage}
              labels={{ showing: t("common.showing"), of: t("common.of"), results: t("common.results"), previous: t("common.previous"), next: t("common.next") }}
            />
          </div>
        ) : null}
      </Section>
    </>
  );
}
