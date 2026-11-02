"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Printer, Save, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSchool } from "@/features/settings/SchoolProvider";
import { useCollection } from "@/hooks/useCollection";
import { bulkCreateDocs, listDocs } from "@/lib/data/store";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { todayKey } from "@/lib/utils/date";
import { describeError } from "@/lib/utils/cn";
import { can, type Capability } from "@/lib/permissions";
import { AccessDenied } from "@/features/crud/ModulePage";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Badge, Button, Card, CardContent, CardHeader, Field, Select, StatCard } from "@/components/ui/primitives";
import { EmptyState, LoadingBlock, SelectFilter, Tabs } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/overlays";
import { AttendanceRegister, PrintToolbar } from "@/components/print/templates";
import type { AttendanceRecord, AttendanceStatus, ClassRoom, Section, Student, Teacher } from "@/types";

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "leave"];

export default function AttendancePage() {
  const { t, locale, formatNumber } = useI18n();
  const toast = useToast();
  const { profile, role } = useAuth();
  const { settings } = useSchool();

  const [tab, setTab] = useState<"mark" | "register">("mark");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [dateKey, setDateKey] = useState(todayKey());
  const [entries, setEntries] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<AttendanceRecord[]>([]);

  const classes = useCollection<ClassRoom>("classes", { where: [["isActive", "==", true]], orderBy: [["numericLevel", "asc"]], limit: 60 });
  const sections = useCollection<Section>("sections", { limit: 120 });
  const teacher = useCollection<Teacher>("teachers", { where: profile?.teacherId ? [["id", "==", profile.teacherId]] : undefined, limit: 1, enabled: Boolean(profile?.teacherId) });

  const sectionOptions = useMemo(
    () => (sections.rows ?? []).filter((section) => !classId || section.classId === classId),
    [sections.rows, classId],
  );

  const students = useCollection<Student>("students", {
    where: [["enrollmentStatus", "==", "active"], ...(classId ? ([["classId", "==", classId]] as [string, "==", string][]) : []), ...(sectionId ? ([["sectionId", "==", sectionId]] as [string, "==", string][]) : [])],
    orderBy: [["rollNo", "asc"]],
    limit: 200,
    enabled: Boolean(classId),
  });

  const dayRecords = useCollection<AttendanceRecord>("attendanceRecords", {
    where: [["dateKey", "==", dateKey], ...(classId ? ([["classId", "==", classId]] as [string, "==", string][]) : [])],
    limit: 300,
    enabled: Boolean(classId),
  });

  useEffect(() => {
    const map: Record<string, AttendanceStatus> = {};
    dayRecords.rows.forEach((record) => {
      map[record.studentId] = record.status;
    });
    setExisting(dayRecords.rows);
    setEntries(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(dayRecords.rows.map((r) => `${r.studentId}:${r.status}`))]);

  const assignedClasses = teacher.rows[0]?.assignedClasses ?? [];
  const isAdmin = can(role, "students.manage" as Capability);
  const isAssigned = !profile?.teacherId || assignedClasses.includes(classId);
  const allowedToMark = can(role, "attendance.mark" as Capability) && (isAdmin || isAssigned);

  const className = (id: string) => {
    const found = classes.rows.find((item) => item.id === id);
    return found ? (locale === "bn" ? found.nameBn || found.name : found.name) : id;
  };

  async function save() {
    if (!classId) {
      toast.error(t("error.title"), locale === "bn" ? "শ্রেণি নির্বাচন করুন।" : "Select a class first.");
      return;
    }
    if (!allowedToMark) {
      toast.error(t("error.permission"));
      return;
    }
    setSaving(true);
    try {
      const records: AttendanceRecord[] = students.rows.map((student) => ({
        // Deterministic id => one record per student per day (no duplicates).
        id: `att-${dateKey}-${student.id}`,
        schoolId: SCHOOL_ID,
        studentId: student.id,
        classId: student.classId,
        sectionId: student.sectionId,
        dateKey,
        status: entries[student.id] ?? "present",
        note: notes[student.id] || undefined,
        markedBy: profile?.uid ?? "unknown",
        createdAt: existing.find((record) => record.studentId === student.id)?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      let written = 0;
      for (let i = 0; i < records.length; i += 50) {
        written += await bulkCreateDocs<AttendanceRecord>("attendanceRecords", records.slice(i, i + 50));
      }
      toast.success(t("attendance.saved"), `${written} ${locale === "bn" ? "জন" : "students"}`);
      dayRecords.reload();
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setSaving(false);
    }
  }

  const summary = STATUSES.map((status) => ({
    status,
    count: students.rows.filter((student) => (entries[student.id] ?? "present") === status).length,
  }));

  if (!can(role, "attendance.view" as Capability)) return <AccessDenied capability="attendance.view" />;

  return (
    <>
      <DashboardPageHeader
        title={t("nav.attendance")}
        description={locale === "bn" ? "প্রতিদিনের উপস্থিতি, সংশোধন ও রেজিস্টার প্রিন্ট।" : "Daily attendance, corrections and printable registers."}
      />

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as "mark" | "register")}
        tabs={[
          { id: "mark", label: t("attendance.markTitle") },
          { id: "register", label: t("attendance.register") },
        ]}
        className="max-w-sm"
      />

      <Card className="mt-4">
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t("common.class")} htmlFor="att-class">
            <Select id="att-class" value={classId} onChange={(event) => { setClassId(event.target.value); setSectionId(""); }}>
              <option value="">{locale === "bn" ? "নির্বাচন করুন" : "Select…"}</option>
              {classes.rows.map((item) => (
                <option key={item.id} value={item.id}>{locale === "bn" ? item.nameBn || item.name : item.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("common.section")} htmlFor="att-section">
            <Select id="att-section" value={sectionId} onChange={(event) => setSectionId(event.target.value)} disabled={!classId}>
              <option value="">{t("common.all")}</option>
              {sectionOptions.map((section) => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={t("common.date")} htmlFor="att-date">
            <input
              id="att-date"
              type="date"
              value={dateKey}
              max={todayKey()}
              onChange={(event) => setDateKey(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:border-royal-500 focus:outline-none focus:ring-2 focus:ring-royal-100"
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={() => setEntries(Object.fromEntries(students.rows.map((student) => [student.id, "present"] as const)))} disabled={students.rows.length === 0}>
              {t("attendance.markAll")}
            </Button>
            {tab === "mark" ? (
              <Button onClick={save} loading={saving} disabled={students.rows.length === 0 || !allowedToMark} icon={<Save className="size-4" />}>
                {t("attendance.submit")}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {!allowedToMark && classId ? (
        <Card className="mt-4 border-rose-200 bg-rose-50">
          <CardContent className="text-sm text-rose-900">
            {t("error.permission")}{" "}
            {locale === "bn"
              ? "আপনি কেবল দায়িত্বপ্রাপ্ত শ্রেণির উপস্থিতি নিতে পারেন।"
              : "Teachers may only mark attendance for classes assigned to them."}
          </CardContent>
        </Card>
      ) : null}

      {existing.length > 0 && tab === "mark" ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-amber-700">
          <CalendarCheck className="size-4" />
          {locale === "bn" ? "এই তারিখের উপস্থিতি আগেই সংরক্ষিত আছে — সংশোধন করলে অডিট তথ্য হালনাগাদ হবে।" : "Attendance already exists for this date — corrections overwrite it and update `updatedAt`/`markedBy`."}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <StatCard key={item.status} label={t(`status.${item.status}`)} value={formatNumber(item.count)} tone={item.status === "present" ? "green" : item.status === "absent" ? "rose" : "amber"} />
        ))}
      </div>

      <Card className="mt-4">
        <CardHeader
          title={<span className="flex items-center gap-2"><Users className="size-4 text-navy-600" />{classId ? `${className(classId)}${sectionId ? ` · ${sections.rows.find((s) => s.id === sectionId)?.name ?? ""}` : ""}` : t("nav.students")}</span>}
          description={`${students.rows.length} ${locale === "bn" ? "জন শিক্ষার্থী" : "students"}`}
          action={tab === "register" ? <PrintToolbar title={t("attendance.register")} /> : undefined}
        />
        {students.loading || dayRecords.loading ? (
          <LoadingBlock label={t("common.loading")} />
        ) : students.rows.length === 0 ? (
          <EmptyState title={t("empty.noData")} body={classId ? undefined : (locale === "bn" ? "শ্রেণি নির্বাচন করুন।" : "Choose a class to begin.")} />
        ) : tab === "register" ? (
          <CardContent>
            <div className="print-area">
              <AttendanceRegister
                records={dayRecords.rows}
                students={students.rows.map((student) => ({ id: student.id, name: student.fullNameBn || student.fullName, rollNo: student.rollNo }))}
                settings={settings}
                title={`${className(classId)}${sectionId ? ` · ${sections.rows.find((s) => s.id === sectionId)?.name ?? ""}` : ""}`}
                dateKey={dateKey}
              />
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-0">
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 text-left">{locale === "bn" ? "রোল" : "Roll"}</th>
                    <th className="px-4 py-2 text-left">{t("common.name")}</th>
                    <th className="px-4 py-2 text-left">{t("common.status")}</th>
                    <th className="hidden px-4 py-2 text-left md:table-cell">{locale === "bn" ? "মন্তব্য" : "Note"}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.rows.map((student) => {
                    const value = entries[student.id] ?? "present";
                    return (
                      <tr key={student.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2 tabular-nums text-slate-600">{student.rollNo}</td>
                        <td className="bn px-4 py-2 font-medium text-slate-800">{student.fullNameBn || student.fullName}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`${student.fullName} status`}>
                            {STATUSES.map((status) => (
                              <button
                                key={status}
                                type="button"
                                role="radio"
                                aria-checked={value === status}
                                onClick={() => setEntries((current) => ({ ...current, [student.id]: status }))}
                                disabled={!allowedToMark}
                                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                                  value === status
                                    ? status === "present"
                                      ? "bg-emerald-600 text-white"
                                      : status === "absent"
                                        ? "bg-rose-600 text-white"
                                        : status === "late"
                                          ? "bg-amber-500 text-white"
                                          : "bg-navy-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                              >
                                {t(`status.${status}`)}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="hidden px-4 py-2 md:table-cell">
                          <input
                            value={notes[student.id] ?? ""}
                            onChange={(event) => setNotes((current) => ({ ...current, [student.id]: event.target.value }))}
                            disabled={!allowedToMark}
                            placeholder="—"
                            className="h-8 w-full max-w-xs rounded-lg border border-slate-200 px-2 text-xs focus:border-royal-500 focus:outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{locale === "bn" ? "সংরক্ষিত রেকর্ড" : "Saved records"}: {existing.length}</Badge>
        {can(role, "reports.view" as Capability) ? (
          <Button
            size="sm"
            variant="outline"
            icon={<Printer className="size-4" />}
            onClick={async () => {
              try {
                const result = await listDocs<AttendanceRecord>("attendanceRecords", {
                  where: [["dateKey", "==", dateKey]],
                  limit: 300,
                });
                setExisting(result.rows);
                toast.info(locale === "bn" ? "দিনের সব রেকর্ড লোড হয়েছে" : "Loaded all records for the day", `${result.rows.length}`);
              } catch (cause) {
                toast.error(t("error.title"), describeError(cause));
              }
            }}
          >
            {locale === "bn" ? "দিনের সারসংক্ষেপ লোড" : "Load day summary"}
          </Button>
        ) : null}
      </div>
    </>
  );
}
