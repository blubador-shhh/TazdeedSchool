"use client";

import { useMemo, useState } from "react";
import { IdCard, Upload } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSchool } from "@/features/settings/SchoolProvider";
import { useCollection } from "@/hooks/useCollection";
import { ModulePage } from "@/features/crud/ModulePage";
import { bulkCreateDocs, listDocs } from "@/lib/data/store";
import type { Row } from "@/features/modules/schema";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { csvToObjects, downloadCsv, previewImport, chunk } from "@/lib/utils/csv";
import { describeError } from "@/lib/utils/cn";
import { todayKey } from "@/lib/utils/date";
import { Button, Card, CardContent, CardHeader, Field, Input, Textarea } from "@/components/ui/primitives";
import { Dialog, useToast } from "@/components/ui/overlays";
import { StudentIdCard, PrintToolbar } from "@/components/print/templates";
import type { ClassRoom, Section, Student } from "@/types";

const CSV_TEMPLATE = "admissionNo,rollNo,fullName,fullNameBn,dateOfBirth,gender,classId,sectionId,guardianName,guardianPhone\nTZD-2026-0099,01,Student Name,শিক্ষার্থীর নাম,2015-01-01,male,class-5,sec-5a,Guardian Name,01700000000";

export default function StudentsPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { can } = useAuth();
  const { settings } = useSchool();
  const classes = useCollection<ClassRoom>("classes", { limit: 60 });
  const sections = useCollection<Section>("sections", { limit: 120 });

  const [printing, setPrinting] = useState<Student | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  const classNameOf = (classId: string) =>
    (classes.rows.find((item) => item.id === classId) ? (locale === "bn" ? classes.rows.find((item) => item.id === classId)?.nameBn : classes.rows.find((item) => item.id === classId)?.name) : classId) ?? classId;
  const sectionNameOf = (sectionId: string) => sections.rows.find((item) => item.id === sectionId)?.name ?? "";

  const preview = useMemo(() => {
    if (!csvText.trim()) return null;
    const records = csvToObjects(csvText);
    return previewImport<Student>(
      records,
      (record) => {
        if (!record.admissionNo) return { error: "admissionNo is required" };
        if (!record.fullName) return { error: "fullName is required" };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(record.dateOfBirth ?? "")) return { error: "dateOfBirth must be YYYY-MM-DD" };
        if (!["male", "female", "other"].includes(record.gender)) return { error: "gender must be male, female or other" };
        if (!record.classId) return { error: "classId is required" };
        if (!record.sectionId) return { error: "sectionId is required" };
        return {
          value: {
            id: `stu-${record.admissionNo.toLowerCase()}`,
            schoolId: SCHOOL_ID,
            admissionNo: record.admissionNo,
            rollNo: record.rollNo ?? "",
            fullName: record.fullName,
            fullNameBn: record.fullNameBn ?? "",
            dateOfBirth: record.dateOfBirth,
            gender: record.gender as Student["gender"],
            classId: record.classId,
            sectionId: record.sectionId,
            academicSessionId: settings?.currentSessionId ?? "",
            guardianUids: [],
            guardianName: record.guardianName ?? "",
            guardianPhone: record.guardianPhone ?? "",
            guardianEmail: record.guardianEmail ?? "",
            address: record.address ?? "",
            photoUrl: "",
            enrollmentStatus: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Student,
        };
      },
      (student) => student.admissionNo,
      [],
    );
  }, [csvText, settings?.currentSessionId]);

  async function runImport() {
    if (!preview || preview.valid.length === 0) {
      toast.error(t("error.title"), locale === "bn" ? "কোনো বৈধ সারি পাওয়া যায়নি।" : "No valid rows found.");
      return;
    }
    setImporting(true);
    try {
      // Duplicate admission numbers are rejected before writing anything.
      const existing = await listDocs<Row>("students", { limit: 500, searchFields: ["admissionNo"] });
      const taken = new Set(existing.rows.map((row) => String(row.admissionNo)));
      const fresh = preview.valid.filter((student) => !taken.has(student.admissionNo));
      const skipped = preview.valid.length - fresh.length;
      let written = 0;
      for (const batch of chunk(fresh, 50)) {
        written += await bulkCreateDocs<Student>("students", batch);
      }
      toast.success(
        locale === "bn" ? `${written} জন শিক্ষার্থী যুক্ত হয়েছে` : `${written} students imported`,
        skipped > 0
          ? locale === "bn"
            ? `${skipped}টি ডুপ্লিকেট ভর্তি নম্বর বাদ দেওয়া হয়েছে।`
            : `${skipped} duplicate admission numbers were skipped.`
          : undefined,
      );
      setImportOpen(false);
      setCsvText("");
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setImporting(false);
    }
  }

  if (!can("students.view")) {
    return <ModulePage moduleId="students" />;
  }

  return (
    <>
      <ModulePage
        moduleId="students"
        toolbarExtra={
          can("students.manage") ? (
            <Button size="sm" variant="outline" icon={<Upload className="size-4" />} onClick={() => setImportOpen(true)}>
              {t("common.import")}
            </Button>
          ) : undefined
        }
        detailExtra={(row) => (
          <Button size="sm" variant="outline" icon={<IdCard className="size-4" />} onClick={() => setPrinting(row as unknown as Student)}>
            {t("print.studentId")}
          </Button>
        )}
      />

      <Dialog open={importOpen} onClose={() => setImportOpen(false)} title={t("common.import")} description={locale === "bn" ? "CSV পেস্ট করুন অথবা ফাইল নির্বাচন করুন।" : "Paste CSV rows or choose a file."} size="lg">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => downloadCsv("students-template.csv", [{ sample: CSV_TEMPLATE }], [{ key: "sample", header: "template", value: (row) => row.sample }])}>
              {locale === "bn" ? "টেমপ্লেট ডাউনলোড" : "Download template"}
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-royal-400">
              <Upload className="size-3.5" />
              {locale === "bn" ? "ফাইল নির্বাচন" : "Choose file"}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setCsvText(await file.text());
                }}
              />
            </label>
          </div>
          <Field label="CSV" htmlFor="csv-input">
            <Textarea id="csv-input" rows={7} value={csvText} onChange={(event) => setCsvText(event.target.value)} placeholder={CSV_TEMPLATE} className="font-mono text-xs" />
          </Field>
          {preview ? (
            <Card>
              <CardHeader
                title={locale === "bn" ? "প্রিভিউ" : "Import preview"}
                description={`${preview.valid.length} ${locale === "bn" ? "বৈধ" : "valid"} · ${preview.issues.length} ${locale === "bn" ? "ত্রুটি" : "errors"} · ${preview.duplicates.length} ${locale === "bn" ? "ডুপ্লিকেট" : "duplicates"}`}
              />
              <CardContent className="max-h-56 overflow-y-auto text-xs">
                {preview.issues.length > 0 ? (
                  <ul className="mb-3 space-y-1 text-rose-700">
                    {preview.issues.slice(0, 12).map((issue) => (
                      <li key={`${issue.row}-${issue.message}`}>Row {issue.row}: {issue.message}</li>
                    ))}
                  </ul>
                ) : null}
                {preview.duplicates.length > 0 ? (
                  <ul className="mb-3 space-y-1 text-amber-700">
                    {preview.duplicates.slice(0, 12).map((issue) => (
                      <li key={`${issue.row}-${issue.message}`}>Row {issue.row}: {issue.message}</li>
                    ))}
                  </ul>
                ) : null}
                {preview.valid.length === 0 && preview.issues.length === 0 ? <p className="text-slate-500">{t("empty.noData")}</p> : null}
                <p className="text-slate-500">
                  {locale === "bn"
                    ? "ইমপোর্ট সীমিত ব্যাচে লেখে (৫০টি করে) যাতে Firestore লেখার সীমা অতিক্রম না হয়।"
                    : "Imports are written in bounded batches of 50 to stay inside Firestore write limits."}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setImportOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={runImport} loading={importing} disabled={!preview || preview.valid.length === 0}>{t("common.import")}</Button>
        </div>
      </Dialog>

      {printing ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 print:static print:bg-white print:p-0">
          <div className="mx-auto max-w-md">
            <div className="no-print">
              <PrintToolbar title={t("print.studentId")}>
                <Button variant="outline" size="sm" onClick={() => setPrinting(null)}>{t("common.close")}</Button>
              </PrintToolbar>
            </div>
            <div className="print-area flex justify-center">
              <StudentIdCard
                student={printing}
                settings={settings}
                className={classNameOf(printing.classId)}
                sectionName={sectionNameOf(printing.sectionId)}
                sessionName={settings?.currentSessionId ?? todayKey().slice(0, 4)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
