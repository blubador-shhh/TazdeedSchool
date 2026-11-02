"use client";

import { useCallback, useEffect, useState } from "react";
import { Calculator, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCollection } from "@/hooks/useCollection";
import { listDocs, bulkCreateDocs } from "@/lib/data/store";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { describeError } from "@/lib/utils/cn";
import { can, type Capability } from "@/lib/permissions";
import { generateResultsForExam } from "@/features/results/generateResults";
import { ModulePage } from "@/features/crud/ModulePage";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Badge, Button, Card, CardContent, CardHeader, Field, Input, Select } from "@/components/ui/primitives";
import { Dialog, useToast } from "@/components/ui/overlays";
import { EmptyState, LoadingBlock } from "@/components/ui/feedback";
import type { ClassRoom, Exam, Mark, Student, Subject, Teacher } from "@/types";

export default function ExamsPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { profile, role } = useAuth();

  const [marksFor, setMarksFor] = useState<Exam | null>(null);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [rows, setRows] = useState<Mark[]>([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [savingMarks, setSavingMarks] = useState(false);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  const classes = useCollection<ClassRoom>("classes", { where: [["isActive", "==", true]], limit: 60 });
  const subjects = useCollection<Subject>("subjects", { limit: 200 });
  const teacher = useCollection<Teacher>("teachers", { where: profile?.teacherId ? [["id", "==", profile.teacherId]] : undefined, limit: 1, enabled: Boolean(profile?.teacherId) });
  const exams = useCollection<Exam>("exams", { orderBy: [["startDate", "desc"]], limit: 20 });

  const assignedSubjects = teacher.rows[0]?.assignedSubjects ?? [];
  const isAdmin = can(role, "exams.manage" as Capability);

  const loadMarks = useCallback(async (exam: Exam, selectedClass: string, selectedSubject: string) => {
    if (!selectedClass || !selectedSubject) return;
    setLoadingMarks(true);
    try {
      const [studentsRes, marksRes] = await Promise.all([
        listDocs<Student>("students", { where: [["enrollmentStatus", "==", "active"], ["classId", "==", selectedClass]], orderBy: [["rollNo", "asc"]], limit: 200 }),
        listDocs<Mark>("marks", { where: [["examId", "==", exam.id], ["subjectId", "==", selectedSubject]], limit: 300 }),
      ]);
      const byStudent = new Map(marksRes.rows.map((mark) => [mark.studentId, mark]));
      setRows(
        studentsRes.rows.map((student) => {
          const existing = byStudent.get(student.id);
          return (
            existing ?? {
              id: `mk-${exam.id}-${student.id}-${selectedSubject}`,
              schoolId: SCHOOL_ID,
              examId: exam.id,
              studentId: student.id,
              subjectId: selectedSubject,
              maximumMarks: 100,
              passMarks: 33,
              obtainedMarks: null,
              status: "pending",
              enteredBy: profile?.uid ?? "unknown",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          );
        }),
      );
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setLoadingMarks(false);
    }
  }, [profile?.uid, t, toast]);

  useEffect(() => {
    if (!marksFor) return;
    const allowedClasses = marksFor.classIds?.length ? marksFor.classIds : classes.rows.map((item) => item.id);
    const initialClass = allowedClasses[0] ?? "";
    const allowedSubjects = isAdmin || !profile?.teacherId ? subjects.rows.map((s) => s.id) : assignedSubjects;
    const initialSubject = allowedSubjects[0] ?? "";
    setClassId(initialClass);
    setSubjectId(initialSubject);
    void loadMarks(marksFor, initialClass, initialSubject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marksFor?.id]);

  async function saveMarks() {
    if (!marksFor) return;
    if (!isAdmin && assignedSubjects.length > 0 && !assignedSubjects.includes(subjectId)) {
      toast.error(t("error.permission"), locale === "bn" ? "আপনি এই বিষয়ের নম্বর দিতে পারবেন না।" : "You are not assigned to this subject.");
      return;
    }
    setSavingMarks(true);
    try {
      const payload: Mark[] = rows.map((row) => ({
        ...row,
        obtainedMarks: row.status === "absent" ? null : row.obtainedMarks,
        enteredBy: profile?.uid ?? "unknown",
        updatedAt: new Date().toISOString(),
      }));
      let written = 0;
      for (let i = 0; i < payload.length; i += 50) {
        written += await bulkCreateDocs<Mark>("marks", payload.slice(i, i + 50));
      }
      toast.success(t("marks.saved"), `${written} ${locale === "bn" ? "টি রেকর্ড" : "records"}`);
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setSavingMarks(false);
    }
  }

  async function generate(exam: Exam) {
    setGenerating((current) => ({ ...current, [exam.id]: true }));
    try {
      const summary = await generateResultsForExam(exam.id, profile?.uid ?? "unknown");
      toast.success(
        locale === "bn" ? `${summary.computed} টি ফলাফল তৈরি হয়েছে` : `${summary.computed} results generated`,
        summary.incomplete > 0
          ? locale === "bn"
            ? `${summary.incomplete} জনের নম্বর অসম্পূর্ণ — বাদ দেওয়া হয়েছে।`
            : `${summary.incomplete} student(s) skipped: marks incomplete.`
          : undefined,
      );
      exams.reload();
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setGenerating((current) => ({ ...current, [exam.id]: false }));
    }
  }

  const selectedExam = marksFor;
  const studentName = (studentId: string) => studentId;

  return (
    <>
      <DashboardPageHeader
        title={t("nav.exams")}
        description={locale === "bn" ? "পরীক্ষা তৈরি, নম্বর প্রবেশ ও ফলাফল গণনা।" : "Create exams, enter marks and generate results."}
      />

      <ModulePage
        moduleId="exams"
        detailExtra={(row, close) => (
          <>
            {can(role, "marks.enter" as Capability) ? (
              <Button size="sm" icon={<Calculator className="size-4" />} onClick={() => { close(); setMarksFor(row as unknown as Exam); }}>
                {t("marks.entryTitle")}
              </Button>
            ) : null}
            {can(role, "results.publish" as Capability) ? (
              <Button size="sm" variant="outline" loading={Boolean(generating[row.id])} onClick={() => void generate(row as unknown as Exam)}>
                {locale === "bn" ? "ফলাফল গণনা" : "Generate results"}
              </Button>
            ) : null}
          </>
        )}
      />

      <Card className="mt-4">
        <CardHeader title={locale === "bn" ? "সাম্প্রতিক পরীক্ষা" : "Recent examinations"} description={t("results.publishedOnly")} />
        <CardContent className="p-0">
          {exams.loading ? (
            <LoadingBlock label={t("common.loading")} />
          ) : exams.rows.length === 0 ? (
            <EmptyState title={t("empty.title")} body={t("empty.body")} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {exams.rows.map((exam) => (
                <li key={exam.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="bn truncate text-sm font-medium text-slate-800">{exam.nameBn || exam.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Badge tone="blue">{exam.category}</Badge>
                      {exam.startDate} → {exam.endDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={exam.publicationStatus === "published" ? "green" : "amber"}>{t(`status.${exam.publicationStatus}`)}</Badge>
                    {can(role, "marks.enter" as Capability) ? (
                      <Button size="sm" variant="outline" onClick={() => setMarksFor(exam)}>{t("marks.entryTitle")}</Button>
                    ) : null}
                    {can(role, "results.publish" as Capability) ? (
                      <Button size="sm" loading={Boolean(generating[exam.id])} onClick={() => void generate(exam)}>
                        {locale === "bn" ? "ফলাফল গণনা" : "Generate results"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedExam)}
        onClose={() => { setMarksFor(null); setRows([]); }}
        title={t("marks.entryTitle")}
        description={selectedExam ? (locale === "bn" ? selectedExam.nameBn || selectedExam.name : selectedExam.name) : undefined}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => { setMarksFor(null); setRows([]); }}>{t("common.close")}</Button>
            <Button onClick={saveMarks} loading={savingMarks} icon={<Save className="size-4" />}>{t("marks.save")}</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("common.class")} htmlFor="marks-class">
            <Select id="marks-class" value={classId} onChange={(event) => { setClassId(event.target.value); void loadMarks(selectedExam!, event.target.value, subjectId); }}>
              {(selectedExam?.classIds?.length ? selectedExam.classIds : classes.rows.map((item) => item.id)).map((id) => (
                <option key={id} value={id}>
                  {locale === "bn" ? classes.rows.find((item) => item.id === id)?.nameBn : classes.rows.find((item) => item.id === id)?.name} {classes.rows.find((item) => item.id === id)?.name ?? id}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("common.subject")} htmlFor="marks-subject">
            <Select id="marks-subject" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); void loadMarks(selectedExam!, classId, event.target.value); }}>
              {(isAdmin || !profile?.teacherId ? subjects.rows : subjects.rows.filter((subject) => assignedSubjects.includes(subject.id))).map((subject) => (
                <option key={subject.id} value={subject.id}>{locale === "bn" ? subject.nameBn || subject.name : subject.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        {loadingMarks ? (
          <LoadingBlock label={t("common.loading")} />
        ) : rows.length === 0 ? (
          <EmptyState title={t("empty.noData")} body={locale === "bn" ? "এই শ্রেণিতে কোনো শিক্ষার্থী নেই।" : "No students in this class."} />
        ) : (
          <div className="scroll-thin mt-4 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[44rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 text-left">{locale === "bn" ? "শিক্ষার্থী" : "Student"}</th>
                  <th className="px-3 py-2 text-right">{locale === "bn" ? "পূর্ণমান" : "Max"}</th>
                  <th className="px-3 py-2 text-right">{locale === "bn" ? "পাস" : "Pass"}</th>
                  <th className="px-3 py-2 text-right">{locale === "bn" ? "প্রাপ্ত" : "Obtained"}</th>
                  <th className="px-3 py-2 text-center">{locale === "bn" ? "অনুপস্থিত" : "Absent"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">{studentName(row.studentId)}</td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        min={1}
                        value={row.maximumMarks}
                        onChange={(event) => setRows((current) => current.map((item) => (item.id === row.id ? { ...item, maximumMarks: Number(event.target.value) } : item)))}
                        className="ml-auto h-8 w-20 text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        min={0}
                        value={row.passMarks}
                        onChange={(event) => setRows((current) => current.map((item) => (item.id === row.id ? { ...item, passMarks: Number(event.target.value) } : item)))}
                        className="ml-auto h-8 w-20 text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        min={0}
                        max={row.maximumMarks}
                        disabled={row.status === "absent"}
                        value={row.obtainedMarks ?? ""}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.id === row.id
                                ? { ...item, obtainedMarks: event.target.value === "" ? null : Number(event.target.value), status: event.target.value === "" ? "pending" : "entered" }
                                : item,
                            ),
                          )
                        }
                        className="ml-auto h-8 w-20 text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.status === "absent"}
                        onChange={(event) =>
                          setRows((current) =>
                            current.map((item) =>
                              item.id === row.id ? { ...item, status: event.target.checked ? "absent" : "pending", obtainedMarks: event.target.checked ? null : item.obtainedMarks } : item,
                            ),
                          )
                        }
                        className="size-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        aria-label={t("status.absent")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Dialog>
    </>
  );
}
