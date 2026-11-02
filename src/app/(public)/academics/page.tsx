"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Layers, Library as LibraryIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSchool } from "@/features/settings/SchoolProvider";
import { useCollection } from "@/hooks/useCollection";
import { Badge, Card, CardContent, CardHeader, Select } from "@/components/ui/primitives";
import { EmptyState, LoadingBlock } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/Icon";
import { PageHero, Section } from "@/components/public/Cards";
import type { ClassRoom, Subject } from "@/types";

/** Public academics page: configured programmes, the published class list and
 *  the subjects taught in the selected class. Only non-personal academic
 *  configuration is exposed here. */
export default function AcademicsPage() {
  const { t, locale, tl } = useI18n();
  const { site } = useSchool();
  const [classId, setClassId] = useState<string>("all");

  const classes = useCollection<ClassRoom>("classes", { where: [["isActive", "==", true]], orderBy: [["numericLevel", "asc"]], limit: 60 });
  const subjects = useCollection<Subject>("subjects", { limit: 200 });

  const programs = useMemo(() => (site?.programs ?? []).filter((program) => program.active), [site]);
  const visibleSubjects = useMemo(() => {
    const rows = subjects.rows ?? [];
    if (classId === "all") return rows;
    return rows.filter((subject) => (subject.classIds ?? []).includes(classId));
  }, [subjects.rows, classId]);

  return (
    <>
      <PageHero eyebrow={t("nav.academics")} title={t("academics.title")} subtitle={t("home.programsSubtitle")} />

      <Section className="bg-white">
        <h2 className="text-xl font-bold text-navy-700">{t("home.programsTitle")}</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {programs.length === 0 ? (
            <Card className="sm:col-span-2 lg:col-span-4">
              <EmptyState icon={<Layers className="size-6" />} title={t("empty.title")} body={t("empty.body")} />
            </Card>
          ) : (
            programs.map((program) => (
              <Card key={program.id} className="p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-royal-50 text-royal-600">
                  <Icon name="graduation-cap" className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{tl({ bn: program.titleBn, en: program.titleEn })}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{tl({ bn: program.bodyBn, en: program.bodyEn })}</p>
              </Card>
            ))
          )}
        </div>
      </Section>

      <Section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-navy-700">{locale === "bn" ? "শ্রেণি ও বিষয়" : "Classes & subjects"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {locale === "bn" ? "স্কুলে চালু শ্রেণি ও বিষয়ভিত্তিক পাঠ্যক্রম।" : "Active classes and the subjects taught in each."}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="sr-only sm:not-sr-only">{t("common.class")}</span>
            <Select value={classId} onChange={(event) => setClassId(event.target.value)} className="w-52">
              <option value="all">{t("common.all")}</option>
              {(classes.rows ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {locale === "bn" ? item.nameBn || item.name : item.name}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><BookOpen className="size-4 text-navy-600" />{t("common.class")}</span>} />
            <CardContent className="p-0">
              {classes.loading ? (
                <LoadingBlock label={t("common.loading")} />
              ) : (classes.rows ?? []).length === 0 ? (
                <EmptyState title={t("empty.noData")} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {(classes.rows ?? []).map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setClassId(item.id)}
                        className={`flex w-full items-center justify-between px-5 py-3 text-left text-sm transition-colors hover:bg-royal-50/50 ${classId === item.id ? "bg-royal-50 text-royal-800" : "text-slate-700"}`}
                      >
                        <span className="font-medium">{locale === "bn" ? item.nameBn || item.name : item.name}</span>
                        <Badge tone="neutral">{item.numericLevel}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={<span className="flex items-center gap-2"><LibraryIcon className="size-4 text-emerald-brand" />{t("common.subjects")}</span>} description={`${visibleSubjects.length}`} />
            <CardContent className="p-0">
              {subjects.loading ? (
                <LoadingBlock label={t("common.loading")} />
              ) : visibleSubjects.length === 0 ? (
                <EmptyState title={t("empty.noData")} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {visibleSubjects.map((subject) => (
                    <li key={subject.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {locale === "bn" ? subject.nameBn || subject.name : subject.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {subject.code} · {subject.creditHours} {locale === "bn" ? "ক্রেডিট" : "credits"}
                        </p>
                      </div>
                      {subject.isOptional ? <Badge tone="amber">{t("common.optional")}</Badge> : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Link href="/admission/" className="text-sm font-semibold text-royal-700 hover:underline">
            {t("home.ctaAdmission")} →
          </Link>
        </div>
      </Section>
    </>
  );
}
