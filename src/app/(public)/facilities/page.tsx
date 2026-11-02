"use client";

import { useI18n } from "@/lib/i18n";
import { useSchool } from "@/features/settings/SchoolProvider";
import { Card } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/Icon";
import { PageHero, Section } from "@/components/public/Cards";
import { isSafeImageUrlFallback } from "@/lib/utils/format";

export default function FacilitiesPage() {
  const { t, locale, tl } = useI18n();
  const { site } = useSchool();
  const facilities = (site?.facilities ?? []).filter((facility) => facility.show);
  const images = [
    isSafeImageUrlFallback("/images/school/campus.jpg"),
    isSafeImageUrlFallback("/images/gallery/library-reading.jpg"),
    isSafeImageUrlFallback("/images/gallery/creative-drawing.jpg"),
  ].filter(Boolean);

  return (
    <>
      <PageHero
        eyebrow={t("nav.facilities")}
        title={t("facilities.title")}
        subtitle={locale === "bn" ? "স্কুলে বর্তমানে চালু সুবিধাসমূহ।" : "Facilities currently available at the school."}
      />
      <Section className="bg-white">
        {facilities.length === 0 ? (
          <Card>
            <EmptyState title={t("empty.title")} body={t("empty.body")} />
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((facility) => (
              <Card key={facility.id} className="p-6 transition-shadow hover:shadow-lift">
                <span className="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Icon name={facility.icon} className="size-6" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-slate-900">{tl({ bn: facility.titleBn, en: facility.titleEn })}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{tl({ bn: facility.bodyBn, en: facility.bodyEn })}</p>
              </Card>
            ))}
          </div>
        )}
        <p className="mt-8 rounded-xl border border-slate-200 bg-soft px-4 py-3 text-xs leading-relaxed text-slate-500">
          {locale === "bn"
            ? "সুবিধার তালিকা প্রশাসক সেটিংস → ওয়েবসাইট কনটেন্ট থেকে হালনাগাদ করেন।"
            : "This list is maintained by the administrator in Settings → Public website content."}
        </p>
      </Section>
      <Section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((src) => (
            <div key={src} className="overflow-hidden rounded-2xl border border-slate-200 shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={t("facilities.title")} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
