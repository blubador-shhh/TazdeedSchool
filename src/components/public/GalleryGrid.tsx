"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n";
import { isSafeImageUrlFallback } from "@/lib/utils/format";
import type { GalleryItem } from "@/types";

/** Responsive gallery grid with an accessible lightbox. Images are bundled
 *  static assets or validated https URLs — never uploaded to Firebase. */
export function GalleryGrid({ items, columns = 3 }: { items: GalleryItem[]; columns?: 3 | 4 }) {
  const { t, locale, tl } = useI18n();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const step = useCallback(
    (direction: number) => {
      setActiveIndex((current) => {
        if (current === null) return current;
        return (current + direction + items.length) % items.length;
      });
    },
    [items.length],
  );

  useEffect(() => {
    if (activeIndex === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [activeIndex, close, step]);

  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-card border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <ImageIcon className="size-8 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">{t("empty.noData")}</p>
      </div>
    );
  }

  const active = activeIndex !== null ? items[activeIndex] : null;

  return (
    <>
      <ul
        className={cn(
          "grid gap-4",
          columns === 4 ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {items.map((item, index) => {
          const title = tl({ bn: item.titleBn, en: item.titleEn }) || item.caption || "";
          const src = isSafeImageUrlFallback(item.imageUrl);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className="group relative block w-full overflow-hidden rounded-card border border-slate-200 bg-slate-100 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift"
                aria-label={`${t("gallery.open")}: ${title}`}
              >
                <span className="block aspect-[4/3] w-full">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={title}
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span className="grid size-full place-items-center bg-gradient-to-br from-navy-100 to-royal-100 text-navy-300">
                      <ImageIcon className="size-8" />
                    </span>
                  )}
                </span>
                {title ? (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 to-transparent px-3 pb-2 pt-8 text-left text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {title}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {active ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={tl({ bn: active.titleBn, en: active.titleEn }) || t("gallery.title")}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label={t("common.close")}
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label={t("common.previous")}
            className="absolute left-2 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="size-6" />
          </button>
          <figure className="max-h-full w-full max-w-4xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={isSafeImageUrlFallback(active.imageUrl)}
              alt={tl({ bn: active.titleBn, en: active.titleEn }) || ""}
              className="mx-auto max-h-[75vh] w-auto rounded-xl object-contain"
            />
            <figcaption className="mt-3 text-center text-sm text-slate-200">
              {tl({ bn: active.titleBn, en: active.titleEn })}
              {active.album ? <span className="ml-2 text-xs text-slate-400">{locale === "bn" ? "অ্যালবাম" : "Album"}: {active.album}</span> : null}
            </figcaption>
          </figure>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label={t("common.next")}
            className="absolute right-2 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>
      ) : null}
    </>
  );
}
