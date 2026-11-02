"use client";

import Link from "next/link";
import { ArrowRight, Target, Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { schoolName, useSchool } from "@/features/settings/SchoolProvider";
import { isSafeImageUrlFallback } from "@/lib/utils/format";
import { Button, Card, CardContent, CardHeader } from "@/components/ui/primitives";
import { PageHero, Section } from "@/components/public/Cards";

export default function AboutPage() {
  const { t, locale } = useI18n();
  const { site, settings, loading } = useSchool();
  const name = schoolName(settings, locale);
  const image = isSafeImageUrlFallback(site?.aboutImageUrl, "/images/school/about-classroom.jpg");
  const campus = isSafeImageUrlFallback(settings?.logoUrl, "/images/school/campus.jpg");

  return (
    <>
      <PageHero eyebrow={t("nav.about")} title={t("about.title")} subtitle={locale === "bn" ? settings?.taglineBn : settings?.taglineEn} />

      <Section className="bg-white">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-navy-700">{name}</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600 sm:text-base">
              {(locale === "bn" ? site?.aboutBodyBn : site?.aboutBodyEn) ||
                (locale === "bn"
                  ? "[স্কুলের প্রকৃত পরিচিতি সেটিংস → ওয়েবসাইট কনটেন্ট থেকে যুক্ত করুন।]"
                  : "[Add the real school introduction in Settings → Public website content.]")}
            </p>
            {loading ? <p className="mt-4 text-xs text-slate-400">{t("common.loading")}</p> : null}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader title={<span className="flex items-center gap-2"><Eye className="size-4 text-royal-600" />{locale === "bn" ? "দৃষ্টিভঙ্গি" : "Vision"}</span>} />
                <CardContent className="text-sm leading-relaxed text-slate-600">
                  {(locale === "bn" ? site?.visionBn : site?.visionEn) || "—"}
                </CardContent>
              </Card>
              <Card>
                <CardHeader title={<span className="flex items-center gap-2"><Target className="size-4 text-emerald-brand" />{locale === "bn" ? "মিশন" : "Mission"}</span>} />
                <CardContent className="text-sm leading-relaxed text-slate-600">
                  {(locale === "bn" ? site?.missionBn : site?.missionEn) || "—"}
                </CardContent>
              </Card>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/admission/">
                <Button icon={<ArrowRight className="size-4" />}>{t("home.ctaAdmission")}</Button>
              </Link>
              <Link href="/contact/">
                <Button variant="outline">{t("nav.contact")}</Button>
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={name} className="aspect-[4/3] w-full object-cover" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={campus} alt={locale === "bn" ? "ক্যাম্পাস" : "Campus"} className="aspect-[16/9] w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
