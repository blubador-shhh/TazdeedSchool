"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Award, FileCheck2, Printer } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSchool } from "@/features/settings/SchoolProvider";
import { useCollection } from "@/hooks/useCollection";
import { useStudentNames } from "@/hooks/useLookups";
import { updateDocById } from "@/lib/data/store";
import { describeError } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { can, type Capability } from "@/lib/permissions";
import { AccessDenied } from "@/features/crud/ModulePage";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Badge, Button, Card, CardContent, CardHeader, Field, Select, StatCard, StatusBadge } from "@/components/ui/primitives";
import { EmptyState, LoadingBlock } from "@/components/ui/feedback";
import { Dialog, useToast } from "@/components/ui/overlays";
import { Marksheet, PrintToolbar } from "@/components/print/templates";
import type { Exam, Result, Student } from "@/types";

export default function ResultsPage() {
  const { t, locale, formatNumber } = useI18n();
  const toast = useToast();
  const { profile, role } = useAuth();
  const { settings } = useSchool();
  const { names, lookups } = useStudentNames(locale);

  const exams = useCollection<Exam>("exams", { orderBy: [["startDate", "desc"]], limit: 20 });
  const [examId, setExamId] = useState("");
  const [printing, setPrinting] = useState<Result | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [tabulation, setTabulation] = useState(false);

  const results = useCollection<Result>("results", {
    where: examId ? [["examId", "==", examId]] : undefined,
    orderBy: [["meritPosition", "asc"]],
    limit: 300,
    enabled: Boolean(examId),
  });

  const ownIds = useMemo(() => {
    if (role === "student") return profile?.studentId ? [profile.studentId] : [];
    if (role === "parent") return profile?.guardianStudentIds ?? [];
    return null;
  }, [role, profile]);

  const visible = useMemo(() => {
    let rows = results.rows;
    if (ownIds) rows = rows.filter((result) => ownIds.includes(result.studentId));
    if (!can(role, "results.publish" as Capability)) rows = rows.filter((result) => result.publicationStatus === "published");
    return rows;
  }, [results.rows, ownIds, role]);

  const selectedExam = exams.rows.find((exam) => exam.id === examId) ?? null;
  const passed = visible.filter((result) => result.status === "passed").length;
  const averageGpa = visible.length ? (visible.reduce((sum, result) => sum + result.gpa, 0) / visible.length).toFixed(2) : "0.00";

  async function publishAll(next: "published" | "draft") {
    setPublishing(true);
    try {
      const stamp = new Date().toISOString();
      for (const result of visible.filter((item) => item.publicationStatus !== next)) {
        await updateDocById("results", result.id, next === "published"
          ? { publicationStatus: "published", publishedAt: stamp, approvedBy: profile?.uid }
          : { publicationStatus: "draft", publishedAt: null });
      }
      toast.success(next === "published" ? (locale === "bn" ? "ফলাফল প্রকাশিত হয়েছে" : "Results published") : (locale === "bn" ? "খসড়ায় ফেরানো হয়েছে" : "Returned to draft"));
      results.reload();
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setPublishing(false);
    }
  }

  if (!can(role, "results.view" as Capability) && !can(role, "results.viewOwn" as Capability)) {
    return <AccessDenied capability="results.view" />;
  }

  const studentOf = (studentId: string): Student | null => lookups.students[studentId] ?? null;
  const classNameOf = (studentId: string) => {
    const student = studentOf(studentId);
    const found = student ? lookups.classes[student.classId] : null;
    return found ? (locale === "bn" ? found.nameBn || found.name : found.name) : "—";
  };

  return (
    <>
      <DashboardPageHeader
        title={t("nav.results")}
        description={t("results.publishedOnly")}
        actions={
          can(role, "results.publish" as Capability) && visible.length > 0 ? (
            <>
              <Button size="sm" variant="outline" icon={<FileCheck2 className="size-4" />} loading={publishing} onClick={() => publishAll("published")}>
                {t("results.publish")}
              </Button>
              <Button size="sm" variant="ghost" loading={publishing} onClick={() => publishAll("draft")}>
                {locale === "bn" ? "খসড়ায় ফেরান" : "Unpublish"}
              </Button>
              <Button size="sm" variant="outline" icon={<Printer className="size-4" />} onClick={() => setTabulation(true)}>
                {t("results.tabulation")}
              </Button>
            </>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={locale === "bn" ? "পরীক্ষা" : "Examination"} htmlFor="result-exam">
            <Select id="result-exam" value={examId} onChange={(event) => setExamId(event.target.value)}>
              <option value="">{locale === "bn" ? "পরীক্ষা নির্বাচন করুন" : "Select an exam"}</option>
              {exams.rows.map((exam) => (
                <option key={exam.id} value={exam.id}>{locale === "bn" ? exam.nameBn || exam.name : exam.name}</option>
              ))}
            </Select>
          </Field>
          <StatCard label={locale === "bn" ? "ফলাফল" : "Results"} value={formatNumber(visible.length)} icon={<Award className="size-5" />} tone="blue" />
          <StatCard label={t("status.passed")} value={formatNumber(passed)} tone="green" />
          <StatCard label={locale === "bn" ? "গড় জিপিএ" : "Average GPA"} value={averageGpa} tone="navy" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={selectedExam ? (locale === "bn" ? selectedExam.nameBn || selectedExam.name : selectedExam.name) : t("nav.results")} />
        {results.loading ? (
          <LoadingBlock label={t("common.loading")} />
        ) : !examId ? (
          <EmptyState title={locale === "bn" ? "পরীক্ষা নির্বাচন করুন" : "Select an examination"} body={t("empty.body")} />
        ) : visible.length === 0 ? (
          <EmptyState title={t("empty.title")} body={t("results.publishedOnly")} action={<Link href="/dashboard/exams/"><Button size="sm" variant="outline">{t("marks.entryTitle")}</Button></Link>} />
        ) : (
          <CardContent className="p-0">
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[48rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-2 text-left">{locale === "bn" ? "মেধাক্রম" : "Merit"}</th>
                    <th className="px-4 py-2 text-left">{t("common.name")}</th>
                    <th className="hidden px-4 py-2 text-left sm:table-cell">{t("common.class")}</th>
                    <th className="px-4 py-2 text-right">{t("common.total")}</th>
                    <th className="px-4 py-2 text-right">%</th>
                    <th className="px-4 py-2 text-center">{locale === "bn" ? "গ্রেড" : "Grade"}</th>
                    <th className="px-4 py-2 text-center">GPA</th>
                    <th className="px-4 py-2 text-center">{t("common.status")}</th>
                    <th className="px-4 py-2 text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((result) => (
                    <tr key={result.id} className="border-b border-slate-100 last:border-0 hover:bg-royal-50/40">
                      <td className="px-4 py-2.5 tabular-nums text-slate-600">{result.meritPosition ?? "—"}</td>
                      <td className="bn px-4 py-2.5 font-medium text-slate-800">{names[result.studentId] ?? result.studentId}</td>
                      <td className="hidden px-4 py-2.5 text-slate-600 sm:table-cell">{classNameOf(result.studentId)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{result.totalMarks}/{result.totalMaximum}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{result.percentage}%</td>
                      <td className="px-4 py-2.5 text-center font-semibold">{result.grade}</td>
                      <td className="px-4 py-2.5 text-center tabular-nums">{result.gpa}</td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <StatusBadge status={result.status} label={t(`status.${result.status}`)} />
                          <Badge tone={result.publicationStatus === "published" ? "green" : "amber"}>{t(`status.${result.publicationStatus}`)}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button size="sm" variant="outline" icon={<Printer className="size-3.5" />} onClick={() => setPrinting(result)}>
                          {t("results.marksheet")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {printing ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 print:static print:bg-white print:p-0">
          <div className="mx-auto max-w-3xl">
            <div className="no-print">
              <PrintToolbar title={t("results.marksheet")}>
                <Button variant="outline" size="sm" onClick={() => setPrinting(null)}>{t("common.close")}</Button>
              </PrintToolbar>
            </div>
            <div className="print-area">
              <Marksheet
                student={studentOf(printing.studentId)}
                examName={selectedExam ? (locale === "bn" ? selectedExam.nameBn || selectedExam.name : selectedExam.name) : printing.examId}
                result={printing}
                settings={settings}
                className={classNameOf(printing.studentId)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {tabulation ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 print:static print:bg-white print:p-0">
          <div className="mx-auto max-w-5xl">
            <div className="no-print">
              <PrintToolbar title={t("results.tabulation")}>
                <Button variant="outline" size="sm" onClick={() => setTabulation(false)}>{t("common.close")}</Button>
              </PrintToolbar>
            </div>
            <div className="print-area rounded-xl border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="bn text-lg font-bold text-navy-700">
                {selectedExam ? (locale === "bn" ? selectedExam.nameBn || selectedExam.name : selectedExam.name) : t("results.tabulation")}
              </h2>
              <p className="text-xs text-slate-500">{locale === "bn" ? "প্রিন্টের তারিখ" : "Printed"}: {formatDate(new Date(), locale)}</p>
              <table className="print-table mt-3 w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th className="border border-slate-300 px-2 py-1.5 text-left">{locale === "bn" ? "মেধাক্রম" : "Merit"}</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">{t("common.name")}</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">{locale === "bn" ? "ভর্তি নম্বর" : "Admission no."}</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-right">{t("common.total")}</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-right">%</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center">{locale === "bn" ? "গ্রেড" : "Grade"}</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center">GPA</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((result) => (
                    <tr key={result.id}>
                      <td className="border border-slate-300 px-2 py-1.5">{result.meritPosition ?? "—"}</td>
                      <td className="bn border border-slate-300 px-2 py-1.5">{names[result.studentId] ?? result.studentId}</td>
                      <td className="border border-slate-300 px-2 py-1.5">{studentOf(result.studentId)?.admissionNo ?? "—"}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{result.totalMarks}/{result.totalMaximum}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{result.percentage}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">{result.grade}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">{result.gpa}</td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center">{t(`status.${result.status}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
