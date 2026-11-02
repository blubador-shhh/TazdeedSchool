"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileJson, HardDriveDownload } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { listDocs } from "@/lib/data/store";
import { can, type Capability } from "@/lib/permissions";
import { AccessDenied } from "@/features/crud/ModulePage";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Button, Card, CardContent, CardHeader, StatCard } from "@/components/ui/primitives";
import { EmptyState, LoadingBlock } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/overlays";
import { downloadCsv, downloadJson } from "@/lib/utils/csv";
import { formatMoney, toTaka } from "@/lib/utils/money";
import { describeError } from "@/lib/utils/cn";
import { lastNDays, monthKey, toDateKey } from "@/lib/utils/date";
import type { AttendanceRecord, CollectionName, Expense, Invoice, Payment, Result, Student } from "@/types";

const EXPORTABLE: { collection: CollectionName; label: { bn: string; en: string }; capability: Capability }[] = [
  { collection: "students", label: { bn: "শিক্ষার্থী", en: "Students" }, capability: "students.export" },
  { collection: "teachers", label: { bn: "শিক্ষক", en: "Teachers" }, capability: "teachers.view" },
  { collection: "classes", label: { bn: "শ্রেণি", en: "Classes" }, capability: "academics.view" },
  { collection: "attendanceRecords", label: { bn: "উপস্থিতি", en: "Attendance" }, capability: "attendance.view" },
  { collection: "results", label: { bn: "ফলাফল", en: "Results" }, capability: "results.view" },
  { collection: "invoices", label: { bn: "চালান", en: "Invoices" }, capability: "fees.view" },
  { collection: "payments", label: { bn: "পেমেন্ট", en: "Payments" }, capability: "fees.view" },
  { collection: "expenses", label: { bn: "ব্যয়", en: "Expenses" }, capability: "expenses.view" },
  { collection: "notices", label: { bn: "নোটিশ", en: "Notices" }, capability: "notices.view" },
];

export default function ReportsPage() {
  const { t, locale, formatNumber } = useI18n();
  const toast = useToast();
  const { role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    attendance: AttendanceRecord[];
    invoices: Invoice[];
    payments: Payment[];
    expenses: Expense[];
    students: Student[];
    results: Result[];
  } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const days = lastNDays(30);
      const from = days[0];
      const [attendance, invoices, payments, expenses, students, results] = await Promise.all([
        can(role, "attendance.view" as Capability)
          ? listDocs<AttendanceRecord>("attendanceRecords", { where: [["dateKey", ">=", from]], limit: 500 })
          : Promise.resolve({ rows: [] as AttendanceRecord[], total: 0, hasMore: false }),
        can(role, "fees.view" as Capability) ? listDocs<Invoice>("invoices", { limit: 500 }) : Promise.resolve({ rows: [] as Invoice[], total: 0, hasMore: false }),
        can(role, "fees.view" as Capability) ? listDocs<Payment>("payments", { limit: 500 }) : Promise.resolve({ rows: [] as Payment[], total: 0, hasMore: false }),
        can(role, "expenses.view" as Capability) ? listDocs<Expense>("expenses", { limit: 500 }) : Promise.resolve({ rows: [] as Expense[], total: 0, hasMore: false }),
        can(role, "students.view" as Capability) ? listDocs<Student>("students", { limit: 500 }) : Promise.resolve({ rows: [] as Student[], total: 0, hasMore: false }),
        can(role, "results.view" as Capability) ? listDocs<Result>("results", { limit: 500 }) : Promise.resolve({ rows: [] as Result[], total: 0, hasMore: false }),
      ]);
      setData({
        attendance: attendance.rows,
        invoices: invoices.rows,
        payments: payments.rows,
        expenses: expenses.rows,
        students: students.rows,
        results: results.rows,
      });
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!data) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const attendanceTrend = useMemo(() => {
    if (!data) return [];
    const days = lastNDays(14);
    return days.map((day) => {
      const dayRows = data.attendance.filter((record) => record.dateKey === day);
      const present = dayRows.filter((record) => record.status === "present" || record.status === "late").length;
      return { name: day.slice(5), present, absent: dayRows.length - present };
    });
  }, [data]);

  const financeTrend = useMemo(() => {
    if (!data) return [];
    const months = new Set<string>();
    data.payments.forEach((payment) => months.add((payment.createdAt ?? "").slice(0, 7)));
    data.expenses.forEach((expense) => months.add(monthKey(expense.expenseDate)));
    months.add(monthKey());
    return Array.from(months)
      .filter(Boolean)
      .sort()
      .slice(-6)
      .map((month) => {
        const collected = data.payments
          .filter((payment) => payment.verificationStatus === "verified" && (payment.createdAt ?? "").slice(0, 7) === month)
          .reduce((sum, payment) => sum + payment.amountPaisa, 0);
        const spent = data.expenses
          .filter((expense) => monthKey(expense.expenseDate) === month)
          .reduce((sum, expense) => sum + expense.amountPaisa, 0);
        return { name: month, collected: toTaka(collected), spent: toTaka(spent) };
      });
  }, [data]);

  const classDistribution = useMemo(() => {
    if (!data) return [];
    const counts = new Map<string, number>();
    data.students.forEach((student) => counts.set(student.classId, (counts.get(student.classId) ?? 0) + 1));
    return Array.from(counts.entries()).map(([classId, value]) => ({ name: classId, value }));
  }, [data]);

  const resultsSummary = useMemo(() => {
    if (!data) return [];
    const passed = data.results.filter((result) => result.status === "passed").length;
    return [
      { name: t("status.passed"), value: passed, fill: "#10B981" },
      { name: t("status.failed"), value: data.results.length - passed, fill: "#f43f5e" },
    ];
  }, [data, t]);

  async function exportCollection(entry: (typeof EXPORTABLE)[number], format: "csv" | "json") {
    try {
      const result = await listDocs<Record<string, unknown> & { id: string }>(entry.collection, { limit: 500 });
      if (result.rows.length === 0) {
        toast.info(t("empty.noData"));
        return;
      }
      const keys = Array.from(new Set(result.rows.flatMap((row) => Object.keys(row)))).sort();
      if (format === "csv") {
        downloadCsv(`${entry.collection}.csv`, result.rows, keys.map((key) => ({ key, header: key, value: (row) => (Array.isArray(row[key]) ? (row[key] as unknown[]).join("|") : row[key] as string) })));
      } else {
        downloadJson(`${entry.collection}.json`, result.rows);
      }
      toast.success(locale === "bn" ? "এক্সপোর্ট সম্পন্ন" : "Export complete", `${result.rows.length} ${locale === "bn" ? "টি রেকর্ড" : "records"}`);
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    }
  }

  if (!can(role, "reports.view" as Capability)) return <AccessDenied capability="reports.view" />;

  const totalCollected = data?.payments.filter((p) => p.verificationStatus === "verified").reduce((sum, p) => sum + p.amountPaisa, 0) ?? 0;
  const totalSpent = data?.expenses.reduce((sum, expense) => sum + expense.amountPaisa, 0) ?? 0;
  const attendanceRate = data && data.attendance.length > 0
    ? Math.round((data.attendance.filter((record) => record.status === "present" || record.status === "late").length / data.attendance.length) * 100)
    : 0;

  return (
    <>
      <DashboardPageHeader
        title={t("nav.reports")}
        description={locale === "bn" ? "সব সংখ্যা Firestore থেকে হিসাব করা — কোনো নকল ডেটা নেই।" : "Every figure is computed from Firestore data — no hardcoded numbers."}
        actions={<Button size="sm" variant="outline" onClick={() => void load()} loading={loading}>{t("common.retry")}</Button>}
      />

      {loading && !data ? <LoadingBlock label={t("common.loading")} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dash.feesCollected")} value={formatMoney(totalCollected, locale)} tone="green" />
        <StatCard label={t("nav.expenses")} value={formatMoney(totalSpent, locale)} tone="rose" />
        <StatCard label={`${t("dash.attendanceToday")} (30d)`} value={`${attendanceRate}%`} tone="blue" />
        <StatCard label={t("dash.publishedResults")} value={formatNumber(data?.results.filter((result) => result.publicationStatus === "published").length ?? 0)} tone="navy" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("dash.attendanceTrend")} description={locale === "bn" ? "গত ১৪ দিন" : "Last 14 days"} />
          <CardContent>
            {!data || attendanceTrend.every((row) => row.present + row.absent === 0) ? (
              <EmptyState title={t("empty.noData")} />
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceTrend} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke="#10B981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="absent" stroke="#f43f5e" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={locale === "bn" ? "আদায় বনাম ব্যয়" : "Collection vs expenses"} description={locale === "bn" ? "গত ৬ মাস" : "Last 6 months"} />
          <CardContent>
            {!data || financeTrend.length === 0 ? (
              <EmptyState title={t("empty.noData")} />
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={financeTrend} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="collected" name={locale === "bn" ? "আদায়" : "Collected"} fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="spent" name={locale === "bn" ? "ব্যয়" : "Spent"} fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={locale === "bn" ? "শ্রেণিভিত্তিক শিক্ষার্থী" : "Students per class"} />
          <CardContent>
            {classDistribution.length === 0 ? (
              <EmptyState title={t("empty.noData")} />
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={classDistribution} dataKey="value" nameKey="name" outerRadius={85} label>
                      {classDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.name.length % 2 === 0 ? "#2563EB" : "#173B68"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={locale === "bn" ? "ফলাফলের সারসংক্ষেপ" : "Result summary"} />
          <CardContent>
            {resultsSummary.every((row) => row.value === 0) ? (
              <EmptyState title={t("empty.noData")} />
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={resultsSummary} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                      {resultsSummary.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader
          title={locale === "bn" ? "ব্যাকআপ ও এক্সপোর্ট" : "Backup & export"}
          description={locale === "bn" ? "ব্রাউজার থেকে অনুমোদিত রেকর্ড CSV/JSON আকারে ডাউনলোড।" : "Download authorized records from the browser as CSV or JSON."}
        />
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {EXPORTABLE.filter((entry) => can(role, entry.capability)).map((entry) => (
              <div key={entry.collection} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                <span className="truncate text-sm text-slate-700">{locale === "bn" ? entry.label.bn : entry.label.en}</span>
                <span className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => void exportCollection(entry, "csv")} aria-label={`CSV ${entry.label.en}`}>
                    <Download className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void exportCollection(entry, "json")} aria-label={`JSON ${entry.label.en}`}>
                    <FileJson className="size-4" />
                  </Button>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            <HardDriveDownload className="mt-0.5 size-4 shrink-0" />
            {locale === "bn"
              ? "এই এক্সপোর্ট ব্রাউজার থেকে নেওয়া হয় এবং সম্পূর্ণ ডেটাবেসের ধারাবাহিক ব্যাকআপ নয়। প্রতিটি কালেকশন সর্বোচ্চ ৫০০টি রেকর্ড পর্যন্ত পড়া হয়। নিয়মিত বিরতিতে এক্সপোর্ট করে আলাদা জায়গায় সংরক্ষণ করুন এবং মাঝে মাঝে যাচাই করুন।"
              : "Browser exports are not a consistent full-database backup: each collection is read up to 500 documents. Export regularly, store copies safely and verify them periodically."}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {locale === "bn" ? `রপোর্টের তারিখ: ${toDateKey()}` : `Report generated: ${toDateKey()}`}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
