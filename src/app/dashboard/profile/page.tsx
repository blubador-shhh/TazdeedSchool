"use client";

import { useEffect, useState } from "react";
import { LogOut, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n, LOCALES } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSchool, schoolName } from "@/features/settings/SchoolProvider";
import { useCollection } from "@/hooks/useCollection";
import { describeError } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, Field, Input, Select, StatusBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/overlays";
import { KeyValue } from "@/components/ui/feedback";
import { StudentIdCard, PrintToolbar } from "@/components/print/templates";
import type { Locale, Student } from "@/types";

export default function ProfilePage() {
  const { t, locale, setLocale } = useI18n();
  const { profile, signOutUser, updateOwnProfile, mode } = useAuth();
  const { settings } = useSchool();
  const toast = useToast();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [displayNameBn, setDisplayNameBn] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<Locale>("bn");
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);

  const student = useCollection<Student>("students", {
    where: profile?.studentId ? [["id", "==", profile.studentId]] : undefined,
    limit: 1,
    enabled: Boolean(profile?.studentId),
  });

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? "");
    setDisplayNameBn(profile.displayNameBn ?? "");
    setPhone(profile.phone ?? "");
    setLanguage(profile.preferredLanguage ?? locale);
  }, [profile, locale]);

  async function save() {
    setSaving(true);
    try {
      await updateOwnProfile({ displayName, displayNameBn, phone, preferredLanguage: language });
      setLocale(language);
      toast.success(t("common.save"));
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return null;
  const myStudent = student.rows[0] ?? null;

  return (
    <>
      <DashboardPageHeader title={t("nav.profile")} description={schoolName(settings, locale)} />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Avatar name={locale === "bn" ? profile.displayNameBn || profile.displayName : profile.displayName} src={profile.photoUrl} size="lg" />
            <div>
              <p className="bn text-lg font-semibold text-navy-700">{locale === "bn" ? profile.displayNameBn || profile.displayName : profile.displayName}</p>
              <p className="text-sm text-slate-500">{profile.email}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge tone="navy">{t(`role.${profile.role}`)}</Badge>
              <StatusBadge status={profile.status} label={t(`status.${profile.status}`)} />
              {mode === "local" ? <Badge tone="amber">{t("common.demoMode")}</Badge> : <Badge tone="green">{t("common.firebaseConnected")}</Badge>}
            </div>
            {myStudent ? (
              <Button size="sm" variant="outline" onClick={() => setPrinting(true)}>{t("print.studentId")}</Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              icon={<LogOut className="size-4" />}
              onClick={async () => {
                await signOutUser();
                router.replace("/login/");
              }}
            >
              {t("nav.logout")}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title={locale === "bn" ? "প্রোফাইল সম্পাদনা" : "Edit profile"} description={locale === "bn" ? "ভূমিকা, অবস্থা ও স্কুল আইডি পরিবর্তনযোগ্য নয়।" : "Role, status and schoolId cannot be changed here."} />
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label={locale === "bn" ? "নাম (ইংরেজি)" : "Display name"} htmlFor="p-name" required>
                <Input id="p-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </Field>
              <Field label={locale === "bn" ? "নাম (বাংলা)" : "Display name (Bengali)"} htmlFor="p-name-bn">
                <Input id="p-name-bn" className="bn" value={displayNameBn} onChange={(event) => setDisplayNameBn(event.target.value)} />
              </Field>
              <Field label={t("common.phone")} htmlFor="p-phone">
                <Input id="p-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </Field>
              <Field label={t("nav.language")} htmlFor="p-lang" hint={locale === "bn" ? "আপনার পছন্দ প্রোফাইলে সংরক্ষিত থাকে।" : "Your preference is stored on your profile."}>
                <Select id="p-lang" value={language} onChange={(event) => setLanguage(event.target.value as Locale)}>
                  {LOCALES.map((item) => (
                    <option key={item.code} value={item.code}>{item.label}</option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Button onClick={save} loading={saving} icon={<Save className="size-4" />}>{t("common.save")}</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title={locale === "bn" ? "অ্যাকাউন্ট তথ্য" : "Account details"} />
            <CardContent>
              <KeyValue
                items={[
                  { label: "UID", value: <span className="font-mono text-xs">{profile.uid}</span> },
                  { label: t("auth.email"), value: profile.email ?? "—" },
                  { label: locale === "bn" ? "ভূমিকা" : "Role", value: t(`role.${profile.role}`) },
                  { label: t("common.status"), value: t(`status.${profile.status}`) },
                  { label: locale === "bn" ? "স্কুল" : "School", value: schoolName(settings, locale) },
                  { label: locale === "bn" ? "শিক্ষার্থী আইডি" : "Student ID", value: profile.studentId ?? "—" },
                  { label: locale === "bn" ? "শিক্ষক আইডি" : "Teacher ID", value: profile.teacherId ?? "—" },
                  { label: locale === "bn" ? "সন্তান" : "Linked children", value: profile.guardianStudentIds?.length ? profile.guardianStudentIds.join(", ") : "—" },
                  { label: locale === "bn" ? "শেষ প্রবেশ" : "Last sign-in", value: formatDate(profile.lastLoginAt ?? profile.createdAt, locale) },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {printing && myStudent ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 print:static print:bg-white print:p-0">
          <div className="mx-auto max-w-md">
            <div className="no-print">
              <PrintToolbar title={t("print.studentId")}>
                <Button variant="outline" size="sm" onClick={() => setPrinting(false)}>{t("common.close")}</Button>
              </PrintToolbar>
            </div>
            <div className="print-area flex justify-center">
              <StudentIdCard student={myStudent} settings={settings} sessionName={settings?.currentSessionId} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
