"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Save, Trash2, Upload } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSchool } from "@/features/settings/SchoolProvider";
import { useCollection } from "@/hooks/useCollection";
import { createDoc, getDocById } from "@/lib/data/store";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { DEFAULT_GRADING_RULE, validateGradingRule } from "@/lib/academics/grading";
import { isSafeImageUrl, isSafeLinkUrl } from "@/lib/validators";
import { describeError } from "@/lib/utils/cn";
import { downloadJson } from "@/lib/utils/csv";
import { can, type Capability } from "@/lib/permissions";
import { AccessDenied } from "@/features/crud/ModulePage";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Badge, Button, Card, CardContent, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/overlays";
import { EmptyState, LoadingBlock, Tabs } from "@/components/ui/feedback";
import type { AcademicSession, GradingRule, PublicSiteContent, SchoolSettings } from "@/types";

type Tab = "school" | "site" | "grading" | "backup";

export default function SettingsPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { role } = useAuth();
  const { reload: reloadSchool } = useSchool();
  const sessions = useCollection<AcademicSession>("academicSessions", { orderBy: [["name", "desc"]], limit: 20 });

  const [tab, setTab] = useState<Tab>("school");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [site, setSite] = useState<PublicSiteContent | null>(null);
  const [rules, setRules] = useState<GradingRule[]>([]);
  const [activeRuleId, setActiveRuleId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [importText, setImportText] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [settingsDoc, siteDoc, rulesRes] = await Promise.all([
          getDocById<SchoolSettings>("schoolSettings", SCHOOL_ID),
          getDocById<PublicSiteContent>("publicSiteContent", "home"),
          // Grading rules are small and bounded.
          (async () => {
            const { listDocs } = await import("@/lib/data/store");
            return listDocs<GradingRule>("gradingRules", { limit: 20 });
          })(),
        ]);
        if (!active) return;
        setSettings(settingsDoc);
        setSite(siteDoc);
        setRules(rulesRes.rows);
        setActiveRuleId(rulesRes.rows[0]?.id ?? "");
      } catch (cause) {
        toast.error(t("error.loadFailed"), describeError(cause));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeRule = useMemo(() => rules.find((rule) => rule.id === activeRuleId) ?? null, [rules, activeRuleId]);

  function validateSettings(): boolean {
    const next: Record<string, string> = {};
    if (settings?.logoUrl && !isSafeImageUrl(settings.logoUrl)) next.logoUrl = t("validation.url");
    (["mapUrl", "facebookUrl", "youtubeUrl", "linkedinUrl"] as const).forEach((key) => {
      if (settings?.[key] && !isSafeLinkUrl(settings[key] as string)) next[key] = t("validation.url");
    });
    if (site?.heroImageUrl && !isSafeImageUrl(site.heroImageUrl)) next.heroImageUrl = t("validation.url");
    if (site?.aboutImageUrl && !isSafeImageUrl(site.aboutImageUrl)) next.aboutImageUrl = t("validation.url");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function saveSchool() {
    if (!settings || !validateSettings()) {
      if (Object.keys(errors).length > 0) toast.error(t("error.title"), t("validation.url"));
      return;
    }
    setSaving(true);
    try {
      const { id: _id, createdAt: _c, updatedAt: _u, ...payload } = settings;
      await createDoc("schoolSettings", payload, SCHOOL_ID);
      reloadSchool();
      toast.success(t("settings.saved"));
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setSaving(false);
    }
  }

  async function saveSite() {
    if (!site || !validateSettings()) return;
    setSaving(true);
    try {
      const { id: _id, createdAt: _c, updatedAt: _u, ...payload } = site;
      await createDoc("publicSiteContent", payload, "home");
      reloadSchool();
      toast.success(t("settings.saved"));
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setSaving(false);
    }
  }

  async function saveRule(rule: GradingRule) {
    const problems = validateGradingRule(rule);
    if (problems.length > 0) {
      toast.error(t("error.title"), problems[0]);
      return;
    }
    setSaving(true);
    try {
      const { id: _id, createdAt: _c, updatedAt: _u, ...payload } = rule;
      await createDoc("gradingRules", { ...payload, schoolId: SCHOOL_ID }, rule.id);
      const refreshed = await getDocById<GradingRule>("gradingRules", rule.id);
      setRules((current) => current.map((item) => (item.id === rule.id ? (refreshed ?? rule) : item)));
      toast.success(t("settings.saved"));
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setSaving(false);
    }
  }

  function newRule() {
    const id = `grade-${Date.now().toString(36)}`;
    const rule: GradingRule = {
      ...(DEFAULT_GRADING_RULE as unknown as Omit<GradingRule, "id" | "schoolId" | "createdAt" | "updatedAt">),
      id,
      schoolId: SCHOOL_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: locale === "bn" ? "নতুন গ্রেডিং নিয়ম" : "New grading rule",
    };
    setRules((current) => [...current, rule]);
    setActiveRuleId(id);
  }

  function importSettings() {
    try {
      const parsed = JSON.parse(importText) as { schoolSettings?: Partial<SchoolSettings>; publicSiteContent?: Partial<PublicSiteContent> };
      if (parsed.schoolSettings && settings) setSettings({ ...settings, ...parsed.schoolSettings, id: SCHOOL_ID });
      if (parsed.publicSiteContent && site) setSite({ ...site, ...parsed.publicSiteContent, id: "home" });
      toast.success(locale === "bn" ? "আমদানি প্রিভিউ হয়েছে — সংরক্ষণ করুন" : "Imported into the form — save to persist");
      setImportText("");
    } catch {
      toast.error(t("error.title"), locale === "bn" ? "JSON পার্স করা যায়নি।" : "Could not parse JSON.");
    }
  }

  if (!can(role, "settings.manage" as Capability)) return <AccessDenied capability="settings.manage" />;

  return (
    <>
      <DashboardPageHeader
        title={t("nav.settings")}
        description={locale === "bn" ? "স্কুলের তথ্য, ওয়েবসাইট কনটেন্ট ও গ্রেডিং নিয়ম।" : "School information, public website content and grading rules."}
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as Tab)}
        tabs={[
          { id: "school", label: t("settings.school") },
          { id: "site", label: t("settings.site") },
          { id: "grading", label: t("settings.grading") },
          { id: "backup", label: locale === "bn" ? "ব্যাকআপ" : "Backup" },
        ]}
        className="max-w-2xl"
      />

      {loading ? (
        <LoadingBlock label={t("common.loading")} />
      ) : (
        <div className="mt-4">
          {tab === "school" ? (
            settings ? (
              <Card>
                <CardHeader title={t("settings.school")} description={`schoolId: ${SCHOOL_ID}`} action={<Button size="sm" onClick={saveSchool} loading={saving} icon={<Save className="size-4" />}>{t("common.save")}</Button>} />
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label={locale === "bn" ? "স্কুলের নাম (ইংরেজি)" : "School name (English)"} htmlFor="s-name-en" required>
                    <Input id="s-name-en" value={settings.nameEn} onChange={(event) => setSettings({ ...settings, nameEn: event.target.value })} />
                  </Field>
                  <Field label={locale === "bn" ? "স্কুলের নাম (বাংলা)" : "School name (Bengali)"} htmlFor="s-name-bn" required>
                    <Input id="s-name-bn" className="bn" value={settings.nameBn} onChange={(event) => setSettings({ ...settings, nameBn: event.target.value })} />
                  </Field>
                  <Field label={locale === "bn" ? "ট্যাগলাইন (ইংরেজি)" : "Tagline (English)"} htmlFor="s-tag-en">
                    <Input id="s-tag-en" value={settings.taglineEn ?? ""} onChange={(event) => setSettings({ ...settings, taglineEn: event.target.value })} />
                  </Field>
                  <Field label={locale === "bn" ? "ট্যাগলাইন (বাংলা)" : "Tagline (Bengali)"} htmlFor="s-tag-bn">
                    <Input id="s-tag-bn" className="bn" value={settings.taglineBn ?? ""} onChange={(event) => setSettings({ ...settings, taglineBn: event.target.value })} />
                  </Field>
                  <Field label={locale === "bn" ? "লোগো URL" : "Logo URL"} htmlFor="s-logo" error={errors.logoUrl} hint={locale === "bn" ? "খালি রাখলে বান্ডেল করা লোগো ব্যবহার হবে।" : "Leave empty to use the bundled logo asset."} className="sm:col-span-2">
                    <Input id="s-logo" value={settings.logoUrl ?? ""} onChange={(event) => setSettings({ ...settings, logoUrl: event.target.value })} placeholder="/images/tazdeed-school-logo.png" />
                  </Field>
                  <Field label={locale === "bn" ? "ঠিকানা (ইংরেজি)" : "Address (English)"} htmlFor="s-addr-en" className="sm:col-span-2">
                    <Textarea id="s-addr-en" rows={2} value={settings.addressEn ?? ""} onChange={(event) => setSettings({ ...settings, addressEn: event.target.value })} />
                  </Field>
                  <Field label={locale === "bn" ? "ঠিকানা (বাংলা)" : "Address (Bengali)"} htmlFor="s-addr-bn" className="sm:col-span-2">
                    <Textarea id="s-addr-bn" rows={2} className="bn" value={settings.addressBn ?? ""} onChange={(event) => setSettings({ ...settings, addressBn: event.target.value })} />
                  </Field>
                  <Field label={t("common.phone")} htmlFor="s-phone"><Input id="s-phone" value={settings.phone ?? ""} onChange={(event) => setSettings({ ...settings, phone: event.target.value })} /></Field>
                  <Field label={t("common.email")} htmlFor="s-email"><Input id="s-email" type="email" value={settings.email ?? ""} onChange={(event) => setSettings({ ...settings, email: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "অফিস সময়" : "Opening hours"} htmlFor="s-hours"><Input id="s-hours" value={settings.openingHours ?? ""} onChange={(event) => setSettings({ ...settings, openingHours: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "ম্যাপ লিংক" : "Map link"} htmlFor="s-map" error={errors.mapUrl}><Input id="s-map" value={settings.mapUrl ?? ""} onChange={(event) => setSettings({ ...settings, mapUrl: event.target.value })} /></Field>
                  <Field label="Facebook" htmlFor="s-fb" error={errors.facebookUrl}><Input id="s-fb" value={settings.facebookUrl ?? ""} onChange={(event) => setSettings({ ...settings, facebookUrl: event.target.value })} /></Field>
                  <Field label="YouTube" htmlFor="s-yt" error={errors.youtubeUrl}><Input id="s-yt" value={settings.youtubeUrl ?? ""} onChange={(event) => setSettings({ ...settings, youtubeUrl: event.target.value })} /></Field>
                  <Field label="LinkedIn" htmlFor="s-li" error={errors.linkedinUrl}><Input id="s-li" value={settings.linkedinUrl ?? ""} onChange={(event) => setSettings({ ...settings, linkedinUrl: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "মুদ্রা" : "Currency"} htmlFor="s-cur"><Input id="s-cur" value={settings.currency} onChange={(event) => setSettings({ ...settings, currency: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "টাইমজোন" : "Timezone"} htmlFor="s-tz"><Input id="s-tz" value={settings.timezone} onChange={(event) => setSettings({ ...settings, timezone: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "প্রতিষ্ঠা সাল" : "Established year"} htmlFor="s-year"><Input id="s-year" type="number" value={settings.establishedYear ?? ""} onChange={(event) => setSettings({ ...settings, establishedYear: event.target.value === "" ? undefined : Number(event.target.value) })} /></Field>
                  <Field label={locale === "bn" ? "চলতি শিক্ষাবর্ষ" : "Current session"} htmlFor="s-session">
                    <Select id="s-session" value={settings.currentSessionId ?? ""} onChange={(event) => setSettings({ ...settings, currentSessionId: event.target.value })}>
                      <option value="">{locale === "bn" ? "নির্বাচন করুন" : "Select…"}</option>
                      {sessions.rows.map((session) => (
                        <option key={session.id} value={session.id}>{session.name}</option>
                      ))}
                    </Select>
                  </Field>
                </CardContent>
              </Card>
            ) : (
              <Card><EmptyState title={t("empty.title")} body={locale === "bn" ? "schoolSettings ডকুমেন্ট পাওয়া যায়নি। সংরক্ষণ করলে তৈরি হবে।" : "No schoolSettings document found. Saving will create it."} action={<Button size="sm" onClick={() => setSettings({ id: SCHOOL_ID, schoolId: SCHOOL_ID, nameEn: "Tazdeed School", nameBn: "তাজদীদ স্কুল", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), currency: "BDT", currencyLocale: "bn-BD", timezone: "Asia/Dhaka" } as SchoolSettings)}>{t("common.create")}</Button>} /></Card>
            )
          ) : null}

          {tab === "site" && site ? (
            <div className="space-y-5">
              <Card>
                <CardHeader title={locale === "bn" ? "হোমপেজ হিরো ও পরিচিতি" : "Homepage hero & about"} action={<Button size="sm" onClick={saveSite} loading={saving} icon={<Save className="size-4" />}>{t("common.save")}</Button>} />
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label={locale === "bn" ? "হিরো শিরোনাম (বাংলা)" : "Hero title (Bengali)"} htmlFor="h-title-bn" className="sm:col-span-2"><Input id="h-title-bn" className="bn" value={site.heroTitleBn} onChange={(event) => setSite({ ...site, heroTitleBn: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "হিরো শিরোনাম (ইংরেজি)" : "Hero title (English)"} htmlFor="h-title-en" className="sm:col-span-2"><Input id="h-title-en" value={site.heroTitleEn} onChange={(event) => setSite({ ...site, heroTitleEn: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "হিরো বিবরণ (বাংলা)" : "Hero subtitle (Bengali)"} htmlFor="h-sub-bn" className="sm:col-span-2"><Textarea id="h-sub-bn" className="bn" value={site.heroSubtitleBn} onChange={(event) => setSite({ ...site, heroSubtitleBn: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "হিরো বিবরণ (ইংরেজি)" : "Hero subtitle (English)"} htmlFor="h-sub-en" className="sm:col-span-2"><Textarea id="h-sub-en" value={site.heroSubtitleEn} onChange={(event) => setSite({ ...site, heroSubtitleEn: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "হিরো ছবির URL" : "Hero image URL"} htmlFor="h-img" error={errors.heroImageUrl}><Input id="h-img" value={site.heroImageUrl ?? ""} onChange={(event) => setSite({ ...site, heroImageUrl: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "পরিচিতি ছবির URL" : "About image URL"} htmlFor="a-img" error={errors.aboutImageUrl}><Input id="a-img" value={site.aboutImageUrl ?? ""} onChange={(event) => setSite({ ...site, aboutImageUrl: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "পরিচিতি শিরোনাম (বাংলা)" : "About title (Bengali)"} htmlFor="a-title-bn"><Input id="a-title-bn" className="bn" value={site.aboutTitleBn ?? ""} onChange={(event) => setSite({ ...site, aboutTitleBn: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "পরিচিতি শিরোনাম (ইংরেজি)" : "About title (English)"} htmlFor="a-title-en"><Input id="a-title-en" value={site.aboutTitleEn ?? ""} onChange={(event) => setSite({ ...site, aboutTitleEn: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "পরিচিতি (বাংলা)" : "About body (Bengali)"} htmlFor="a-body-bn" className="sm:col-span-2"><Textarea id="a-body-bn" rows={4} className="bn" value={site.aboutBodyBn ?? ""} onChange={(event) => setSite({ ...site, aboutBodyBn: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "পরিচিতি (ইংরেজি)" : "About body (English)"} htmlFor="a-body-en" className="sm:col-span-2"><Textarea id="a-body-en" rows={4} value={site.aboutBodyEn ?? ""} onChange={(event) => setSite({ ...site, aboutBodyEn: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "দৃষ্টিভঙ্গি (বাংলা)" : "Vision (Bengali)"} htmlFor="v-bn"><Textarea id="v-bn" rows={2} className="bn" value={site.visionBn ?? ""} onChange={(event) => setSite({ ...site, visionBn: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "দৃষ্টিভঙ্গি (ইংরেজি)" : "Vision (English)"} htmlFor="v-en"><Textarea id="v-en" rows={2} value={site.visionEn ?? ""} onChange={(event) => setSite({ ...site, visionEn: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "মিশন (বাংলা)" : "Mission (Bengali)"} htmlFor="m-bn"><Textarea id="m-bn" rows={2} className="bn" value={site.missionBn ?? ""} onChange={(event) => setSite({ ...site, missionBn: event.target.value })} /></Field>
                  <Field label={locale === "bn" ? "মিশন (ইংরেজি)" : "Mission (English)"} htmlFor="m-en"><Textarea id="m-en" rows={2} value={site.missionEn ?? ""} onChange={(event) => setSite({ ...site, missionEn: event.target.value })} /></Field>
                  <div className="flex flex-wrap gap-4 sm:col-span-2">
                    <Checkbox label={locale === "bn" ? "পরিসংখ্যান দেখান" : "Show statistics"} checked={site.showStats} onChange={(event) => setSite({ ...site, showStats: event.target.checked })} />
                    <Checkbox label={locale === "bn" ? "অভিভাবক মতামত দেখান" : "Show testimonials"} checked={site.showTestimonials} onChange={(event) => setSite({ ...site, showTestimonials: event.target.checked })} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader title={t("home.statsTitle")} description={t("home.statsNote")} />
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {(site.stats ?? []).map((stat, index) => (
                    <div key={stat.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-700">{stat.labelEn} · <span className="bn">{stat.labelBn}</span></p>
                        <Checkbox label={locale === "bn" ? "দেখান" : "Show"} checked={stat.show} onChange={(event) => {
                          const stats = [...(site.stats ?? [])];
                          stats[index] = { ...stat, show: event.target.checked };
                          setSite({ ...site, stats });
                        }} />
                      </div>
                      <Input className="mt-2" value={stat.value} placeholder={locale === "bn" ? "মান (যেমন ৮৫০)" : "Value (e.g. 850)"} onChange={(event) => {
                        const stats = [...(site.stats ?? [])];
                        stats[index] = { ...stat, value: event.target.value };
                        setSite({ ...site, stats });
                      }} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {(["programs", "features", "facilities"] as const).map((section) => (
                <Card key={section}>
                  <CardHeader title={section === "programs" ? t("home.programsTitle") : section === "features" ? t("home.featuresTitle") : t("facilities.title")} />
                  <CardContent className="space-y-3">
                    {(site[section] ?? []).map((item, index) => {
                      const list = site[section] as typeof item[];
                      const patch = (partial: Partial<typeof item>) => {
                        const next = [...list];
                        next[index] = { ...item, ...partial };
                        setSite({ ...site, [section]: next } as PublicSiteContent);
                      };
                      const toggleKey = section === "programs" ? "active" : "show";
                      return (
                        <div key={item.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-2">
                          <Field label={locale === "bn" ? "শিরোনাম (বাংলা)" : "Title (Bengali)"} htmlFor={`${section}-${item.id}-bn`}>
                            <Input id={`${section}-${item.id}-bn`} className="bn" value={item.titleBn} onChange={(event) => patch({ titleBn: event.target.value })} />
                          </Field>
                          <Field label={locale === "bn" ? "শিরোনাম (ইংরেজি)" : "Title (English)"} htmlFor={`${section}-${item.id}-en`}>
                            <Input id={`${section}-${item.id}-en`} value={item.titleEn} onChange={(event) => patch({ titleEn: event.target.value })} />
                          </Field>
                          <Field label={locale === "bn" ? "বিবরণ (বাংলা)" : "Body (Bengali)"} htmlFor={`${section}-${item.id}-bbn`} className="sm:col-span-2">
                            <Textarea id={`${section}-${item.id}-bbn`} rows={2} className="bn" value={item.bodyBn} onChange={(event) => patch({ bodyBn: event.target.value })} />
                          </Field>
                          <Field label={locale === "bn" ? "বিবরণ (ইংরেজি)" : "Body (English)"} htmlFor={`${section}-${item.id}-ben`} className="sm:col-span-2">
                            <Textarea id={`${section}-${item.id}-ben`} rows={2} value={item.bodyEn} onChange={(event) => patch({ bodyEn: event.target.value })} />
                          </Field>
                          <div className="flex items-center justify-between gap-2 sm:col-span-2">
                            <Checkbox label={toggleKey === "active" ? (locale === "bn" ? "চালু" : "Active") : (locale === "bn" ? "দেখান" : "Show")} checked={Boolean((item as { active?: boolean; show?: boolean })[toggleKey])} onChange={(event) => patch({ [toggleKey]: event.target.checked } as Partial<typeof item>)} />
                            <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} onClick={() => setSite({ ...site, [section]: list.filter((_, i) => i !== index) } as PublicSiteContent)}>
                              {t("common.delete")}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Plus className="size-4" />}
                      onClick={() => {
                        const id = `${section}-${Date.now().toString(36)}`;
                        const entry = section === "programs"
                          ? { id, titleBn: "", titleEn: "", bodyBn: "", bodyEn: "", active: true }
                          : { id, icon: "sparkles", titleBn: "", titleEn: "", bodyBn: "", bodyEn: "", show: true };
                        setSite({ ...site, [section]: [...(site[section] ?? []), entry] } as PublicSiteContent);
                      }}
                    >
                      {t("common.create")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {tab === "grading" ? (
            <div className="grid gap-5 lg:grid-cols-[0.6fr_1.4fr]">
              <Card>
                <CardHeader title={t("settings.grading")} action={<Button size="sm" variant="outline" icon={<Plus className="size-4" />} onClick={newRule}>{t("common.create")}</Button>} />
                <CardContent className="p-0">
                  {rules.length === 0 ? (
                    <EmptyState title={t("empty.title")} body={locale === "bn" ? "কোনো গ্রেডিং নিয়ম নেই।" : "No grading rules yet."} />
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {rules.map((rule) => (
                        <li key={rule.id}>
                          <button type="button" onClick={() => setActiveRuleId(rule.id)} className={`flex w-full items-center justify-between px-5 py-3 text-left text-sm ${activeRuleId === rule.id ? "bg-royal-50 text-royal-800" : "text-slate-700 hover:bg-slate-50"}`}>
                            <span className="font-medium">{rule.name}</span>
                            <Badge tone="neutral">{rule.bands.length}</Badge>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {activeRule ? (
                <Card>
                  <CardHeader title={activeRule.name} description={locale === "bn" ? "প্রতিটি পরীক্ষার জন্য আলাদা নিয়ম ব্যবহার করা যায়।" : "Each exam can reference a different rule."} action={<Button size="sm" onClick={() => saveRule(activeRule)} loading={saving} icon={<Save className="size-4" />}>{t("common.save")}</Button>} />
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label={locale === "bn" ? "নিয়মের নাম" : "Rule name"} htmlFor="g-name" className="sm:col-span-3">
                        <Input id="g-name" value={activeRule.name} onChange={(event) => setRules((current) => current.map((rule) => (rule.id === activeRule.id ? { ...rule, name: event.target.value } : rule)))} />
                      </Field>
                      <Field label={locale === "bn" ? "ফেল গ্রেড" : "Fail grade"} htmlFor="g-fail">
                        <Input id="g-fail" value={activeRule.failGrade} onChange={(event) => setRules((current) => current.map((rule) => (rule.id === activeRule.id ? { ...rule, failGrade: event.target.value } : rule)))} />
                      </Field>
                      <Field label={locale === "bn" ? "রাউন্ডিং" : "Rounding"} htmlFor="g-round">
                        <Select id="g-round" value={activeRule.rounding} onChange={(event) => setRules((current) => current.map((rule) => (rule.id === activeRule.id ? { ...rule, rounding: event.target.value as GradingRule["rounding"] } : rule)))}>
                          <option value="half-up">half-up</option>
                          <option value="floor">floor</option>
                          <option value="none">none</option>
                        </Select>
                      </Field>
                      <Field label={locale === "bn" ? "দশমিক" : "Decimals"} htmlFor="g-dec">
                        <Input id="g-dec" type="number" min={0} max={4} value={activeRule.decimals} onChange={(event) => setRules((current) => current.map((rule) => (rule.id === activeRule.id ? { ...rule, decimals: Number(event.target.value) } : rule)))} />
                      </Field>
                      <div className="flex flex-wrap gap-4 sm:col-span-3">
                        <Checkbox label={locale === "bn" ? "অনুপস্থিত = ফেল" : "Absent counts as fail"} checked={activeRule.absentCountsAsFail} onChange={(event) => setRules((current) => current.map((rule) => (rule.id === activeRule.id ? { ...rule, absentCountsAsFail: event.target.checked } : rule)))} />
                        <Checkbox label={locale === "bn" ? "ঐচ্ছিক বিষয় ফেল হলে GPA থেকে বাদ" : "Drop failed optional subjects"} checked={activeRule.dropFailedOptional} onChange={(event) => setRules((current) => current.map((rule) => (rule.id === activeRule.id ? { ...rule, dropFailedOptional: event.target.checked } : rule)))} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
                        <p className="text-sm font-semibold text-slate-700">{locale === "bn" ? "গ্রেড ব্যান্ড" : "Grade bands"}</p>
                        <Button size="sm" variant="outline" icon={<Plus className="size-4" />} onClick={() => setRules((current) => current.map((rule) => (rule.id === activeRule.id ? { ...rule, bands: [...rule.bands, { grade: "", point: 0, minPercent: 0 }] } : rule)))}>
                          {t("common.create")}
                        </Button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {activeRule.bands.map((band, index) => (
                          <div key={`${band.grade}-${index}`} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2 px-4 py-2">
                            <Input value={band.grade} placeholder="A+" onChange={(event) => setRules((current) => current.map((rule) => rule.id === activeRule.id ? { ...rule, bands: rule.bands.map((b, i) => (i === index ? { ...b, grade: event.target.value } : b)) } : rule))} />
                            <Input type="number" step="0.01" value={band.point} onChange={(event) => setRules((current) => current.map((rule) => rule.id === activeRule.id ? { ...rule, bands: rule.bands.map((b, i) => (i === index ? { ...b, point: Number(event.target.value) } : b)) } : rule))} />
                            <Input type="number" value={band.minPercent} onChange={(event) => setRules((current) => current.map((rule) => rule.id === activeRule.id ? { ...rule, bands: rule.bands.map((b, i) => (i === index ? { ...b, minPercent: Number(event.target.value) } : b)) } : rule))} />
                            <Button size="sm" variant="ghost" aria-label={t("common.delete")} onClick={() => setRules((current) => current.map((rule) => rule.id === activeRule.id ? { ...rule, bands: rule.bands.filter((_, i) => i !== index) } : rule))}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <p className="px-4 py-2 text-[11px] text-slate-500">
                        {locale === "bn" ? "ক্রম: গ্রেড, পয়েন্ট, সর্বনিম্ন শতকরা (উপর থেকে নিচে কমতে হবে)।" : "Order: grade, point, minimum percentage (descending)."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}

          {tab === "backup" ? (
            <Card>
              <CardHeader title={locale === "bn" ? "ব্যাকআপ ও কনফিগারেশন এক্সপোর্ট" : "Backup & configuration export"} />
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" icon={<Download className="size-4" />} onClick={() => downloadJson("tazdeed-settings.json", { schoolSettings: settings, publicSiteContent: site, gradingRules: rules })}>
                    {locale === "bn" ? "সেটিংস JSON ডাউনলোড" : "Download settings JSON"}
                  </Button>
                  <a href="/dashboard/reports/"><Button size="sm" variant="outline" icon={<Download className="size-4" />}>{locale === "bn" ? "রেকর্ড এক্সপোর্ট" : "Export records"}</Button></a>
                </div>
                <Field label={locale === "bn" ? "JSON ইমপোর্ট" : "Import JSON"} htmlFor="b-import">
                  <Textarea id="b-import" rows={6} className="font-mono text-xs" value={importText} onChange={(event) => setImportText(event.target.value)} />
                </Field>
                <Button size="sm" icon={<Upload className="size-4" />} onClick={importSettings}>{locale === "bn" ? "ফর্মে আমদানি" : "Load into form"}</Button>
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                  {locale === "bn"
                    ? "ব্রাউজার-ভিত্তিক ব্যাকআপ সম্পূর্ণ ডেটাবেসের ধারাবাহিক স্ন্যাপশট নয়। Firestore-এর নিজস্ব এক্সপোর্ট (Blaze প্ল্যান) বা নিয়মিত ম্যানুয়াল এক্সপোর্ট ব্যবহার করুন এবং ফাইলগুলো যাচাই করে রাখুন।"
                    : "A browser export is not a consistent full-database snapshot. Use Firestore's native export (Blaze plan) or periodic manual exports, store them safely and verify them."}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
