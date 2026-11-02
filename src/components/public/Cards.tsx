"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, Clock, MapPin, Tag } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n";
import { formatDate, isSafeImageUrlFallback } from "@/lib/utils/format";
import { Badge, Card, StatusBadge } from "@/components/ui/primitives";
import type { Notice, SchoolEvent } from "@/types";

export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 bg-gradient-to-br from-navy-700 via-navy-600 to-royal-700 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal-200">{eyebrow}</p> : null}
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]">{title}</h1>
        {subtitle ? <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">{subtitle}</p> : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}

export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20", className)}>
      {children}
    </section>
  );
}

export function NoticeCard({ notice, detailed = false }: { notice: Notice; detailed?: boolean }) {
  const { t, locale } = useI18n();
  const title = locale === "bn" ? notice.titleBn || notice.titleEn : notice.titleEn || notice.titleBn;
  const body = locale === "bn" ? notice.descriptionBn || notice.descriptionEn : notice.descriptionEn || notice.descriptionBn;
  return (
    <Card className="flex h-full flex-col p-5 transition-shadow hover:shadow-lift">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">
          <Tag className="size-3" /> {notice.category}
        </Badge>
        <StatusBadge status={notice.publicationStatus} label={t(`status.${notice.publicationStatus}`)} />
        <span className="ml-auto text-xs text-slate-500">{formatDate(notice.publishedAt || notice.createdAt, locale)}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug text-navy-700">{title}</h3>
      <p className={cn("mt-2 flex-1 text-sm leading-relaxed text-slate-600", !detailed && "line-clamp-3")}>{body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {notice.attachmentUrl ? (
          <a
            href={notice.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-royal-700 hover:underline"
          >
            {t("common.download")} <ArrowRight className="size-3.5" />
          </a>
        ) : null}
        {notice.visibility !== "public" ? (
          <span className="text-xs text-slate-400">{notice.visibility}</span>
        ) : null}
      </div>
    </Card>
  );
}

export function EventCard({ event }: { event: SchoolEvent }) {
  const { t, locale } = useI18n();
  const title = locale === "bn" ? event.titleBn || event.titleEn : event.titleEn || event.titleBn;
  const body = locale === "bn" ? event.descriptionBn || event.descriptionEn : event.descriptionEn || event.descriptionBn;
  const image = isSafeImageUrlFallback(event.imageUrl);
  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lift">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-navy-50">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={title} className="size-full object-cover" loading="lazy" />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-navy-100 to-royal-100 text-navy-400">
            <CalendarDays className="size-8" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-navy-700 shadow-sm">
          {formatDate(event.eventDate, locale)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold leading-snug text-navy-700">{title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{body}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {event.startTime ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {event.startTime}
              {event.endTime ? ` – ${event.endTime}` : ""}
            </span>
          ) : null}
          {event.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {event.location}
            </span>
          ) : null}
          <StatusBadge status={event.publicationStatus} label={t(`status.${event.publicationStatus}`)} />
        </div>
      </div>
    </Card>
  );
}

export function LinkCard({
  href,
  title,
  body,
  icon,
}: {
  href: string;
  title: string;
  body?: string;
  icon?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full items-start gap-4 rounded-card border border-slate-200 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-royal-200 hover:shadow-lift"
    >
      {icon ? (
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-600 transition-colors group-hover:bg-royal-600 group-hover:text-white">
          {icon}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        {body ? <span className="mt-1 block text-sm leading-relaxed text-slate-600">{body}</span> : null}
      </span>
    </Link>
  );
}
