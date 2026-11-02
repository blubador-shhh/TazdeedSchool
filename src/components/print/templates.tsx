"use client";

import type { ReactNode } from "react";
import { Printer } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { schoolName } from "@/features/settings/SchoolProvider";
import { isSafeImageUrlFallback } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/money";
import type { AttendanceRecord, Invoice, Notice, Payment, Result, SchoolSettings, Student } from "@/types";

/**
 * Browser-printable documents.
 *
 * Everything here prints through `window.print()` + "Save as PDF". No
 * server-side PDF service is used, and every template carries the school logo,
 * configured address/contact details and both Bengali and English labels.
 */

export function PrintToolbar({ title, children }: { title?: string; children?: ReactNode }) {
  const { t, locale } = useI18n();
  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
      <div>
        <p className="text-sm font-semibold text-slate-800">{title ?? t("common.print")}</p>
        <p className="text-xs text-slate-500">
          {locale === "bn" ? "প্রিন্ট ডায়ালগ থেকে “Save as PDF” নির্বাচন করা যায়।" : "Use the browser print dialog, then “Save as PDF”."}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {children}
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
        >
          <Printer className="size-4" /> {t("common.print")}
        </button>
      </div>
    </div>
  );
}

function PrintLogo({ settings }: { settings: SchoolSettings | null }) {
  const src = isSafeImageUrlFallback(settings?.logoUrl, "/images/tazdeed-school-logo.svg");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="logo" className="size-14 shrink-0 rounded object-contain" />
  );
}

export function Letterhead({ settings, subtitle }: { settings: SchoolSettings | null; subtitle?: string }) {
  const { locale } = useI18n();
  const name = schoolName(settings, locale);
  const address = locale === "bn" ? settings?.addressBn || settings?.addressEn : settings?.addressEn || settings?.addressBn;
  return (
    <header className="flex items-center gap-4 border-b-2 border-navy-600 pb-3">
      <PrintLogo settings={settings} />
      <div className="min-w-0 flex-1">
        <h1 className="bn text-xl font-bold text-navy-700">{settings?.nameBn || name}</h1>
        <p className="text-sm font-medium text-slate-600">{settings?.nameEn}</p>
        {address ? <p className="mt-1 text-xs text-slate-500">{address}</p> : null}
        <p className="text-xs text-slate-500">
          {[settings?.phone, settings?.email].filter(Boolean).join(" · ")}
        </p>
      </div>
      {subtitle ? <p className="shrink-0 text-sm font-semibold uppercase tracking-wide text-navy-600">{subtitle}</p> : null}
    </header>
  );
}

/* --------------------------------- ID cards -------------------------------- */

export function StudentIdCard({
  student,
  settings,
  className,
  sectionName,
  sessionName,
}: {
  student: Student;
  settings: SchoolSettings | null;
  className?: string;
  sectionName?: string;
  sessionName?: string;
}) {
  const { locale, t } = useI18n();
  const name = schoolName(settings, locale);
  const photo = isSafeImageUrlFallback(student.photoUrl);
  return (
    <div className="print-id-card w-[340px] overflow-hidden rounded-xl border border-navy-200 bg-white shadow-card print:w-auto print:shadow-none">
      <div className="flex items-center gap-2 bg-navy-600 px-3 py-2 text-white">
        <PrintLogo settings={settings} />
        <div className="min-w-0">
          <p className="bn truncate text-sm font-bold">{settings?.nameBn || name}</p>
          <p className="truncate text-[10px] text-slate-200">{settings?.nameEn}</p>
        </div>
      </div>
      <div className="flex gap-3 p-3">
        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-navy-700">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={student.fullName} className="size-full object-cover" />
          ) : (
            <span className="text-lg font-bold">{student.fullName.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
        <dl className="min-w-0 flex-1 text-[11px] leading-relaxed">
          <div><dt className="text-slate-500">{t("common.name")}</dt><dd className="bn font-semibold text-slate-900">{student.fullNameBn || student.fullName}</dd></div>
          <div><dt className="text-slate-500">{locale === "bn" ? "ভর্তি নম্বর" : "Admission no."}</dt><dd className="font-semibold text-slate-900">{student.admissionNo}</dd></div>
          <div><dt className="text-slate-500">{locale === "bn" ? "শ্রেণি ও শাখা" : "Class & section"}</dt><dd className="font-semibold text-slate-900">{className ?? student.classId}{sectionName ? ` – ${sectionName}` : ""}</dd></div>
          <div><dt className="text-slate-500">{locale === "bn" ? "রোল" : "Roll"}</dt><dd className="font-semibold text-slate-900">{student.rollNo}</dd></div>
          {student.guardianPhone ? <div><dt className="text-slate-500">{locale === "bn" ? "অভিভাবক" : "Guardian"}</dt><dd className="font-semibold text-slate-900">{student.guardianPhone}</dd></div> : null}
        </dl>
      </div>
      <div className="flex items-center justify-between border-t border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-[10px] text-slate-600">
        <span>{sessionName ?? ""}</span>
        <span>{locale === "bn" ? "কার্ডটি হারালে অফিসে জানান" : "Report a lost card to the office"}</span>
      </div>
    </div>
  );
}

export function StaffIdCard({
  name,
  nameBn,
  employeeId,
  designation,
  settings,
  phone,
}: {
  name: string;
  nameBn?: string;
  employeeId: string;
  designation?: string;
  settings: SchoolSettings | null;
  phone?: string;
}) {
  const { locale, t } = useI18n();
  const school = schoolName(settings, locale);
  return (
    <div className="print-id-card w-[340px] overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-card print:shadow-none">
      <div className="flex items-center gap-2 bg-emerald-700 px-3 py-2 text-white">
        <PrintLogo settings={settings} />
        <div className="min-w-0">
          <p className="bn truncate text-sm font-bold">{settings?.nameBn || school}</p>
          <p className="truncate text-[10px] text-emerald-100">{t("print.staffId")}</p>
        </div>
      </div>
      <dl className="space-y-1 p-3 text-[11px]">
        <div><dt className="text-slate-500">{t("common.name")}</dt><dd className="bn font-semibold text-slate-900">{nameBn || name}</dd></div>
        <div><dt className="text-slate-500">{locale === "bn" ? "কর্মী আইডি" : "Employee ID"}</dt><dd className="font-semibold text-slate-900">{employeeId}</dd></div>
        <div><dt className="text-slate-500">{locale === "bn" ? "পদবি" : "Designation"}</dt><dd className="font-semibold text-slate-900">{designation || "—"}</dd></div>
        {phone ? <div><dt className="text-slate-500">{t("common.phone")}</dt><dd className="font-semibold text-slate-900">{phone}</dd></div> : null}
      </dl>
    </div>
  );
}

/* --------------------------------- Receipt --------------------------------- */

export function FeeReceipt({
  invoice,
  student,
  settings,
  payments,
  className,
}: {
  invoice: Invoice;
  student?: Student | null;
  settings: SchoolSettings | null;
  payments: Payment[];
  className?: string;
}) {
  const { locale, t } = useI18n();
  const verified = payments.filter((payment) => payment.verificationStatus === "verified");
  return (
    <div className="print-avoid-break rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <Letterhead settings={settings} subtitle={locale === "bn" ? "পেমেন্ট রশিদ" : "Payment receipt"} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-slate-500">{locale === "bn" ? "রশিদ নম্বর" : "Receipt no."}</dt><dd className="font-semibold text-slate-900">{invoice.receiptNo || invoice.id}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">{t("common.name")}</dt><dd className="bn font-semibold text-slate-900">{student?.fullNameBn || student?.fullName || invoice.studentId}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">{locale === "bn" ? "ভর্তি নম্বর" : "Admission no."}</dt><dd className="font-semibold text-slate-900">{student?.admissionNo || "—"}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">{t("common.class")}</dt><dd className="font-semibold text-slate-900">{className || "—"}</dd></div>
        </dl>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-slate-500">{locale === "bn" ? "সময়কাল" : "Period"}</dt><dd className="font-semibold text-slate-900">{invoice.period}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">{locale === "bn" ? "ফির ধরন" : "Fee type"}</dt><dd className="font-semibold text-slate-900">{invoice.feeType}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">{locale === "bn" ? "নির্ধারিত তারিখ" : "Due date"}</dt><dd className="font-semibold text-slate-900">{formatDate(invoice.dueDate, locale)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate-500">{locale === "bn" ? "প্রিন্টের তারিখ" : "Printed"}</dt><dd className="font-semibold text-slate-900">{formatDate(new Date(), locale)}</dd></div>
        </dl>
      </div>

      <table className="print-table mt-4 w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="border border-slate-300 px-2 py-1.5">{locale === "bn" ? "বিবরণ" : "Description"}</th>
            <th className="border border-slate-300 px-2 py-1.5">{t("common.date")}</th>
            <th className="border border-slate-300 px-2 py-1.5">{locale === "bn" ? "মাধ্যম" : "Method"}</th>
            <th className="border border-slate-300 px-2 py-1.5 text-right">{t("common.amount")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-slate-300 px-2 py-1.5">{locale === "bn" ? "মোট প্রদেয়" : "Total payable"}</td>
            <td className="border border-slate-300 px-2 py-1.5">{formatDate(invoice.dueDate, locale)}</td>
            <td className="border border-slate-300 px-2 py-1.5">—</td>
            <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{formatMoney(invoice.amountPaisa, locale)}</td>
          </tr>
          {invoice.discountPaisa > 0 ? (
            <tr>
              <td className="border border-slate-300 px-2 py-1.5">{locale === "bn" ? "ছাড়" : "Discount"}</td>
              <td className="border border-slate-300 px-2 py-1.5">—</td>
              <td className="border border-slate-300 px-2 py-1.5">—</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">- {formatMoney(invoice.discountPaisa, locale)}</td>
            </tr>
          ) : null}
          {verified.map((payment) => (
            <tr key={payment.id}>
              <td className="border border-slate-300 px-2 py-1.5">{locale === "bn" ? "পরিশোধ" : "Payment"} {payment.transactionReference ? `(${payment.transactionReference})` : ""}</td>
              <td className="border border-slate-300 px-2 py-1.5">{formatDate(payment.createdAt, locale)}</td>
              <td className="border border-slate-300 px-2 py-1.5">{payment.method}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{formatMoney(payment.amountPaisa, locale)}</td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold">
            <td className="border border-slate-300 px-2 py-1.5" colSpan={3}>{locale === "bn" ? "বকেয়া" : "Outstanding due"}</td>
            <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{formatMoney(invoice.dueAmountPaisa, locale)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        {locale === "bn"
          ? "মোবাইল ব্যাংকিংয়ের রেফারেন্স কেবল অনুমোদিত কর্মী যাচাই করলেই গৃহীত হয়।"
          : "Mobile banking references count only after verification by authorized staff."}
      </p>
      <div className="mt-10 flex justify-end">
        <div className="border-t border-slate-400 px-6 pt-1 text-center text-xs text-slate-600">
          {locale === "bn" ? "অনুমোদিত স্বাক্ষর" : "Authorized signature"}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Marksheet -------------------------------- */

export function Marksheet({
  student,
  examName,
  result,
  settings,
  className,
}: {
  student: Student | null;
  examName: string;
  result: Result;
  settings: SchoolSettings | null;
  className?: string;
}) {
  const { locale, t } = useI18n();
  return (
    <div className="print-avoid-break rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <Letterhead settings={settings} subtitle={locale === "bn" ? "মার্কশিট" : "Marksheet"} />
      <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
        <p><span className="text-slate-500">{t("common.name")}:</span> <span className="bn font-semibold">{student?.fullNameBn || student?.fullName || result.studentId}</span></p>
        <p><span className="text-slate-500">{locale === "bn" ? "পরীক্ষা" : "Exam"}:</span> <span className="font-semibold">{examName}</span></p>
        <p><span className="text-slate-500">{t("common.class")}:</span> <span className="font-semibold">{className || "—"}{student ? ` · ${locale === "bn" ? "রোল" : "Roll"} ${student.rollNo}` : ""}</span></p>
      </div>

      <table className="print-table mt-4 w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th className="border border-slate-300 px-2 py-1.5 text-left">{t("common.subject")}</th>
            <th className="border border-slate-300 px-2 py-1.5 text-right">{locale === "bn" ? "পূর্ণমান" : "Max"}</th>
            <th className="border border-slate-300 px-2 py-1.5 text-right">{locale === "bn" ? "পাস নম্বর" : "Pass"}</th>
            <th className="border border-slate-300 px-2 py-1.5 text-right">{locale === "bn" ? "প্রাপ্ত" : "Obtained"}</th>
            <th className="border border-slate-300 px-2 py-1.5 text-center">{locale === "bn" ? "গ্রেড" : "Grade"}</th>
            <th className="border border-slate-300 px-2 py-1.5 text-center">{locale === "bn" ? "পয়েন্ট" : "Point"}</th>
          </tr>
        </thead>
        <tbody>
          {result.subjects.map((subject) => (
            <tr key={subject.subjectId}>
              <td className="border border-slate-300 px-2 py-1.5">{subject.subjectName}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{subject.maximumMarks}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{subject.passMarks}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{subject.obtainedMarks ?? "—"}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold">{subject.grade}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums">{subject.counted ? subject.point : "—"}</td>
            </tr>
          ))}
          <tr className="bg-slate-50 font-semibold">
            <td className="border border-slate-300 px-2 py-1.5">{t("common.total")}</td>
            <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{result.totalMaximum}</td>
            <td className="border border-slate-300 px-2 py-1.5" />
            <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{result.totalMarks}</td>
            <td className="border border-slate-300 px-2 py-1.5 text-center">{result.grade}</td>
            <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums">{result.gpa}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap gap-6 text-sm">
        <p><span className="text-slate-500">{locale === "bn" ? "শতকরা" : "Percentage"}:</span> <span className="font-semibold">{result.percentage}%</span></p>
        <p><span className="text-slate-500">{locale === "bn" ? "ফলাফল" : "Result"}:</span> <span className="font-semibold">{t(`status.${result.status}`)}</span></p>
        {result.meritPosition ? <p><span className="text-slate-500">{locale === "bn" ? "মেধাক্রম" : "Merit position"}:</span> <span className="font-semibold">{result.meritPosition}</span></p> : null}
      </div>

      <div className="mt-12 flex items-end justify-between text-xs text-slate-500">
        <p>{locale === "bn" ? `প্রকাশের তারিখ: ${result.publishedAt ? formatDate(result.publishedAt, locale) : "—"}` : `Published: ${result.publishedAt ? formatDate(result.publishedAt, locale) : "—"}`}</p>
        <div className="border-t border-slate-400 px-6 pt-1 text-center">{locale === "bn" ? "প্রধান শিক্ষকের স্বাক্ষর" : "Headmaster's signature"}</div>
      </div>
    </div>
  );
}

/* ---------------------------- Attendance register --------------------------- */

export function AttendanceRegister({
  records,
  students,
  settings,
  title,
  dateKey,
}: {
  records: AttendanceRecord[];
  students: { id: string; name: string; rollNo: string }[];
  settings: SchoolSettings | null;
  title: string;
  dateKey: string;
}) {
  const { locale, t } = useI18n();
  const statusOf = (studentId: string) => records.find((record) => record.studentId === studentId)?.status ?? "";
  const present = records.filter((record) => record.status === "present").length;
  return (
    <div className="print-avoid-break rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <Letterhead settings={settings} subtitle={locale === "bn" ? "উপস্থিতি রেজিস্টার" : "Attendance register"} />
      <div className="mt-3 flex flex-wrap gap-4 text-sm">
        <p><span className="text-slate-500">{title}</span></p>
        <p><span className="text-slate-500">{t("common.date")}:</span> <span className="font-semibold">{formatDate(dateKey, locale)}</span></p>
        <p><span className="text-slate-500">{locale === "bn" ? "উপস্থিত" : "Present"}:</span> <span className="font-semibold">{present}/{students.length}</span></p>
      </div>
      <table className="print-table mt-3 w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th className="border border-slate-300 px-2 py-1.5 text-left">{locale === "bn" ? "রোল" : "Roll"}</th>
            <th className="border border-slate-300 px-2 py-1.5 text-left">{t("common.name")}</th>
            <th className="border border-slate-300 px-2 py-1.5 text-center">{locale === "bn" ? "অবস্থা" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td className="border border-slate-300 px-2 py-1.5">{student.rollNo}</td>
              <td className="bn border border-slate-300 px-2 py-1.5">{student.name}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-center">{statusOf(student.id) || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------- Notice ---------------------------------- */

export function NoticePrint({ notice, settings }: { notice: Notice; settings: SchoolSettings | null }) {
  const { locale } = useI18n();
  return (
    <div className="print-avoid-break rounded-xl border border-slate-200 bg-white p-6 shadow-card">
      <Letterhead settings={settings} subtitle={locale === "bn" ? "নোটিশ" : "Notice"} />
      <div className="mt-5">
        <h2 className="bn text-lg font-bold text-navy-700">{locale === "bn" ? notice.titleBn || notice.titleEn : notice.titleEn || notice.titleBn}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {formatDate(notice.publishedAt || notice.createdAt, locale)} · {notice.category}
        </p>
        <p className="bn mt-4 whitespace-pre-line text-sm leading-loose text-slate-700">
          {locale === "bn" ? notice.descriptionBn || notice.descriptionEn : notice.descriptionEn || notice.descriptionBn}
        </p>
      </div>
      <div className="mt-14 flex justify-end">
        <div className="border-t border-slate-400 px-6 pt-1 text-center text-xs text-slate-600">
          {locale === "bn" ? "প্রধান শিক্ষক" : "Headmaster"}
        </div>
      </div>
    </div>
  );
}
