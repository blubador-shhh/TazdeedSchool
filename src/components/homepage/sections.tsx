"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Megaphone, Quote } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSchool, schoolName } from "@/features/settings/SchoolProvider";
import { useCollection } from "@/hooks/useCollection";
import { isSafeImageUrlFallback } from "@/lib/utils/format";
import { todayKey } from "@/lib/utils/date";
import { Badge, Button, Card, SectionTitle } from "@/components/ui/primitives";
import { EmptyState, LoadingBlock } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/Icon";
import { EventCard, NoticeCard, Section } from "@/components/public/Cards";
import { GalleryGrid } from "@/components/public/GalleryGrid";
import type { GalleryItem, Notice, SchoolEvent, Testimonial } from "@/types";

/* ----------------------------------- Hero ---------------------------------- */

export function HeroSection() {
  const { t, locale } = useI18n();
  const { site, settings, loading } = useSchool();
  const name = schoolName(settings, locale);
  const heroImage = isSafeImageUrlFallback(site?.heroImageUrl, "/images/hero/hero-classroom.jpg");
  const title = locale === "bn" ? site?.heroTitleBn || t("home.heroTitle") : site?.heroTitleEn || t("home.heroTitle");
  const subtitle =
    locale === "bn" ? site?.heroSubtitleBn || t("home.heroSubtitle") : site?.heroSubtitleEn || t("home.heroSubtitle");

  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_32rem_at_85%_-10%,rgba(37,99,235,0.12),transparent),radial-gradient(40rem_24rem_at_-5%_110%,rgba(16,185,129,0.10),transparent)]"
      />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-20">
        <div className="animate-rise">
          <Badge tone="navy">
            <span className="size-1.5 rounded-full bg-emerald-brand" aria-hidden="true" />
            {locale === "bn" ? settings?.taglineBn || t("home.heroBadge") : settings?.taglineEn || t("home.heroBadge")}
          </Badge>
          <h1 className="mt-5 text-3xl font-extrabold leading-[1.15] tracking-tight text-navy-700 sm:text-4xl lg:text-[3.1rem]">
            {title}
          </h1>
          <p className="mt-2 text-base font-medium text-slate-500 sm:text-lg">{name}</p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">{subtitle}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/admission/">
              <Button size="lg" icon={<ArrowRight className="size-4" />}>
                {t("home.ctaAdmission")}
              </Button>
            </Link>
            <Link href="/about/">
              <Button size="lg" variant="outline">
                {t("home.ctaLearnMore")}
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Megaphone className="size-4 text-royal-600" /> {t("nav.notices")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-emerald-brand" /> {t("nav.events")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Quote className="size-4 text-amber-brand" /> {t("home.testimonialsTitle")}
            </span>
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-lift">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={locale === "bn" ? "তাজদীদ স্কুলের শিক্ষার্থীরা শ্রেণিকক্ষে" : "Tazdeed School students in the classroom"}
              className="aspect-[4/3] w-full object-cover"
              width={1200}
              height={900}
            />
          </div>
          <div className="absolute -bottom-5 left-4 right-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lift backdrop-blur sm:left-auto sm:right-6 sm:w-64">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {loading ? t("common.loading") : locale === "bn" ? "ভর্তি চলছে" : "Admissions"}
            </p>
            <p className="mt-1 text-sm font-semibold text-navy-700">
              {locale === "bn" ? "আবেদন করতে ফর্ম পূরণ করুন" : "Submit the online application form"}
            </p>
            <Link href="/admission/" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-royal-700 hover:underline">
              {t("nav.admission")} <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- Stats ---------------------------------- */

export function StatsSection() {
  const { t, locale, tl } = useI18n();
  const { site } = useSchool();
  if (!site?.showStats) return null;
  const stats = (site.stats ?? []).filter((stat) => stat.show);
  if (stats.length === 0) return null;

  return (
    <section className="border-b border-slate-200 bg-gradient-to-br from-navy-700 to-navy-600 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("home.statsTitle")}</h2>
          <p className="text-xs text-slate-300">{t("home.statsNote")}</p>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.id} className="rounded-xl border border-white/15 bg-white/10 px-4 py-5 text-center">
              <dd className="text-3xl font-bold tracking-tight">
                {stat.value.trim() ? stat.value : <span className="text-slate-300">—</span>}
              </dd>
              <dt className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-200">
                {tl({ bn: stat.labelBn, en: stat.labelEn })}
              </dt>
            </div>
          ))}
        </dl>
        {stats.some((stat) => !stat.value.trim()) ? (
          <p className="mt-4 text-[11px] text-slate-300">
            {locale === "bn"
              ? "সেটিংস → ওয়েবসাইট কনটেন্ট থেকে মান যুক্ত করলে এটি দেখানো হবে।"
              : "Values appear here once set in Settings → Public website content."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/* --------------------------------- Features -------------------------------- */

export function FeaturesSection() {
  const { t, tl } = useI18n();
  const { site } = useSchool();
  const features = (site?.features ?? []).filter((feature) => feature.show);

  return (
    <Section>
      <SectionTitle title={t("home.featuresTitle")} subtitle={t("home.featuresSubtitle")} />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.id} className="group p-6 transition-all hover:-translate-y-0.5 hover:border-royal-200 hover:shadow-lift">
            <span className="grid size-12 place-items-center rounded-xl bg-royal-50 text-royal-600 transition-colors group-hover:bg-royal-600 group-hover:text-white">
              <Icon name={feature.icon} className="size-6" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-900">{tl({ bn: feature.titleBn, en: feature.titleEn })}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{tl({ bn: feature.bodyBn, en: feature.bodyEn })}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/* ---------------------------------- About ---------------------------------- */

export function AboutSection() {
  const { t, locale } = useI18n();
  const { site, settings } = useSchool();
  const image = isSafeImageUrlFallback(site?.aboutImageUrl, "/images/school/about-classroom.jpg");
  const title = locale === "bn" ? site?.aboutTitleBn || t("home.aboutTitle") : site?.aboutTitleEn || t("home.aboutTitle");
  const body = locale === "bn" ? site?.aboutBodyBn || "" : site?.aboutBodyEn || "";
  const vision = locale === "bn" ? site?.visionBn : site?.visionEn;
  const mission = locale === "bn" ? site?.missionBn : site?.missionEn;
  const name = schoolName(settings, locale);

  return (
    <Section className="bg-white">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="relative order-2 lg:order-1">
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
          </div>
          {settings?.establishedYear ? (
            <div className="absolute -right-3 -top-3 rounded-xl bg-emerald-brand px-4 py-3 text-white shadow-lift">
              <p className="text-[11px] uppercase tracking-wide opacity-90">{locale === "bn" ? "প্রতিষ্ঠা" : "Established"}</p>
              <p className="text-xl font-bold">{settings.establishedYear}</p>
            </div>
          ) : null}
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-royal-600">{t("nav.about")}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy-700 sm:text-3xl">{title}</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base">
            {body || (locale === "bn" ? "[স্কুলের বিবরণ সেটিংস থেকে যুক্ত করুন]" : "[Add the school description in Settings]")}
          </p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {vision ? (
              <div className="rounded-xl border border-slate-200 bg-soft p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-navy-600">{locale === "bn" ? "দৃষ্টিভঙ্গি" : "Vision"}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">{vision}</dd>
              </div>
            ) : null}
            {mission ? (
              <div className="rounded-xl border border-slate-200 bg-soft p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-navy-600">{locale === "bn" ? "মিশন" : "Mission"}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">{mission}</dd>
              </div>
            ) : null}
          </dl>
          <Link href="/about/" className="mt-7 inline-block">
            <Button variant="outline" icon={<ArrowRight className="size-4" />}>
              {t("home.aboutMore")}
            </Button>
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* --------------------------------- Programs -------------------------------- */

export function ProgramsSection() {
  const { t, tl } = useI18n();
  const { site } = useSchool();
  const programs = (site?.programs ?? []).filter((program) => program.active);
  if (programs.length === 0) return null;

  return (
    <Section>
      <SectionTitle title={t("home.programsTitle")} subtitle={t("home.programsSubtitle")} />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {programs.map((program, index) => (
          <Card key={program.id} className="relative overflow-hidden p-6">
            <span aria-hidden="true" className="absolute right-4 top-3 text-5xl font-black text-slate-100">
              {index + 1}
            </span>
            <span className="grid size-11 place-items-center rounded-xl bg-navy-50 text-navy-600">
              <Icon name="graduation-cap" className="size-5" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-900">{tl({ bn: program.titleBn, en: program.titleEn })}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{tl({ bn: program.bodyBn, en: program.bodyEn })}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link href="/academics/">
          <Button variant="outline">{t("common.viewAll")}</Button>
        </Link>
      </div>
    </Section>
  );
}

/* --------------------------------- Notices --------------------------------- */

export function NoticesSection() {
  const { t } = useI18n();
  const { rows, loading } = useCollection<Notice>("notices", {
    where: [["publicationStatus", "==", "published"], ["visibility", "==", "public"]],
    orderBy: [["publishedAt", "desc"]],
    limit: 3,
  });

  return (
    <Section className="bg-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle align="left" title={t("home.noticesTitle")} />
        <Link href="/notices/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-royal-700 hover:underline">
          {t("common.viewAll")} <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="mt-8">
        {loading ? (
          <LoadingBlock label={t("common.loading")} />
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState icon={<Megaphone className="size-6" />} title={t("home.noticesEmpty")} />
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} />
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

/* ---------------------------------- Events --------------------------------- */

export function EventsSection() {
  const { t } = useI18n();
  const today = todayKey();
  const { rows, loading } = useCollection<SchoolEvent>("events", {
    where: [["publicationStatus", "==", "published"], ["eventDate", ">=", today]],
    orderBy: [["eventDate", "asc"]],
    limit: 3,
  });

  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle align="left" title={t("home.eventsTitle")} />
        <Link href="/events/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-royal-700 hover:underline">
          {t("common.viewAll")} <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="mt-8">
        {loading ? (
          <LoadingBlock label={t("common.loading")} />
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState icon={<CalendarDays className="size-6" />} title={t("home.eventsEmpty")} />
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

/* --------------------------------- Gallery --------------------------------- */

export function GallerySection() {
  const { t } = useI18n();
  const { rows, loading } = useCollection<GalleryItem>("galleryItems", {
    where: [["isPublished", "==", true]],
    orderBy: [["sortOrder", "asc"]],
    limit: 6,
  });

  return (
    <Section className="bg-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle align="left" title={t("home.galleryTitle")} subtitle={t("home.gallerySubtitle")} />
        <Link href="/gallery/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-royal-700 hover:underline">
          {t("common.viewAll")} <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="mt-8">
        {loading ? <LoadingBlock label={t("common.loading")} /> : <GalleryGrid items={rows} />}
      </div>
    </Section>
  );
}

/* ------------------------------- Testimonials ------------------------------ */

export function TestimonialsSection() {
  const { t, locale, tl } = useI18n();
  const { site, mode } = useSchool();
  const { rows, loading } = useCollection<Testimonial>("testimonials", {
    where: [["isPublished", "==", true]],
    limit: 6,
  });

  if (!site?.showTestimonials) return null;

  // Unverified samples are only ever shown in the local demo fallback and are
  // explicitly labelled, so no invented quote is presented as genuine.
  const visible = rows.filter((item) => item.isVerified || mode === "local");
  if (!loading && visible.length === 0) return null;

  return (
    <Section>
      <SectionTitle title={t("home.testimonialsTitle")} />
      {mode === "local" && visible.some((item) => !item.isVerified) ? (
        <p className="mx-auto mt-3 max-w-2xl rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
          {t("home.testimonialsDemo")}
        </p>
      ) : null}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {loading ? (
          <div className="md:col-span-2">
            <LoadingBlock label={t("common.loading")} />
          </div>
        ) : (
          visible.map((item) => (
            <Card key={item.id} className="p-6">
              <Quote className="size-7 text-royal-200" aria-hidden="true" />
              <blockquote className="mt-3 text-sm leading-relaxed text-slate-700">
                {locale === "bn" ? item.quoteBn || item.quoteEn : item.quoteEn || item.quoteBn}
              </blockquote>
              <figcaption className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                <span className="grid size-10 place-items-center rounded-full bg-navy-50 text-xs font-bold text-navy-700">
                  {(item.parentNameBn || item.parentName || "?").slice(0, 2)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {tl({ bn: item.parentNameBn, en: item.parentName })}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {[item.relation, item.studentName].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {!item.isVerified ? <Badge tone="amber" className="ml-auto">DEMO</Badge> : null}
              </figcaption>
            </Card>
          ))
        )}
      </div>
    </Section>
  );
}

/* ------------------------------- Admission CTA ----------------------------- */

export function AdmissionCta() {
  const { t, locale } = useI18n();
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy-700 via-navy-600 to-royal-700 px-6 py-12 text-white shadow-lift sm:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {locale === "bn" ? "আপনার সন্তানের ভর্তি আবেদন আজই জমা দিন" : "Submit your child's admission application today"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-200">{t("admission.note")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admission/">
              <Button size="lg" variant="success" icon={<ArrowRight className="size-4" />}>
                {t("home.ctaAdmission")}
              </Button>
            </Link>
            <Link href="/contact/">
              <Button size="lg" variant="outline" className="border-white/40 bg-white/10 text-white hover:border-white hover:text-white">
                {t("nav.contact")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
