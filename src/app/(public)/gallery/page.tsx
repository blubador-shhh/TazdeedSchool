"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useCollection } from "@/hooks/useCollection";
import { LoadingBlock, SelectFilter } from "@/components/ui/feedback";
import { GalleryGrid } from "@/components/public/GalleryGrid";
import { PageHero, Section } from "@/components/public/Cards";
import type { GalleryItem } from "@/types";

export default function GalleryPage() {
  const { t } = useI18n();
  const [album, setAlbum] = useState("all");
  const { rows, loading } = useCollection<GalleryItem>("galleryItems", {
    where: [["isPublished", "==", true]],
    orderBy: [["sortOrder", "asc"]],
    limit: 120,
  });

  const albums = useMemo(() => Array.from(new Set(rows.map((item) => item.album).filter(Boolean))) as string[], [rows]);
  const visible = album === "all" ? rows : rows.filter((item) => item.album === album);

  return (
    <>
      <PageHero eyebrow={t("nav.gallery")} title={t("gallery.title")} subtitle={t("home.gallerySubtitle")} />
      <Section className="bg-white">
        <div className="flex flex-wrap items-center gap-3">
          <SelectFilter
            value={album}
            onChange={setAlbum}
            label={t("common.filter")}
            options={[{ value: "all", label: t("common.all") }, ...albums.map((item) => ({ value: item, label: item }))]}
          />
          <span className="ml-auto text-xs text-slate-500">{visible.length} {t("common.results")}</span>
        </div>
        <div className="mt-6">{loading ? <LoadingBlock label={t("common.loading")} /> : <GalleryGrid items={visible} columns={4} />}</div>
      </Section>
    </>
  );
}
