"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  Megaphone,
  Receipt,
  Users,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSchool } from "@/features/settings/SchoolProvider";
import { useCollection } from "@/hooks/useCollection";
import { can, type Capability } from "@/lib/permissions";
import { formatMoney } from "@/lib/utils/money";
import { formatDate, isUpcoming, lastNDays, monthKey, todayKey } from "@/lib/utils/date";
import { sumBy } from "@/lib/utils/cn";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, StatCard, StatusBadge } from "@/components/ui/primitives";
import { EmptyState, LoadingBlock } from "@/components/ui/feedback";
import { Icon } from "@/components/ui/Icon";
import type {
  AttendanceRecord,
  Book,
  ClassRoom,
  Expense,
  Homework,
  Invoice,
  LibraryTransaction,
  Mark,
  Notice,
  Payment,
  Result,
  SchoolEvent,
  Student,
  Subject,
  Teacher,
  AdmissionApplication,
} from "@/types";

const PAGE_LIMIT = 500; // hard cap: dashboards never read unbounded collections

export function QuickAction({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-card transition-all hover:-translate-y-0.5 hover:border-royal-200 hover:text-royal-700 hover:shadow-lift"
    >
      <span className="grid size-9 place-items-center rounded-lg bg-navy-50 text-navy-600">
        <Icon name={icon} className="size-4" />
      </span>
      {label}
    </Link>
  );
}

function MiniList<T extends { id: string }>({
  title,
  rows,
  loading,
  render,
  href,
  emptyText,
}: {
  title: string;
  rows: T[];
  loading?: boolean;
  render: (row: T) => React.ReactNode;
  href?: string;
  emptyText: string;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader
        title={title}
        action={href ? <Link href={href} className="text-xs font-semibold text-royal-700 hover:underline">{t("common.viewAll")}</Link> : undefined}
      />
      <CardContent className="p-0">
        {loading ? (
          <LoadingBlock label={t("common.loading")} />
        ) : rows.length === 0 ? (
          <EmptyState title={emptyText} />
        ) : (
          <ul className="divide-y divide-slate-100">{rows.map((row) => <li key={row.id}>{render(row)}</li>)}</ul>
        )}
      </CardContent>
    </Card>
  );
}

function NoticeRow({ notice }: { notice: Notice }) {
  const { locale } = useI18n();
  return (
    <div className="px-5 py-3">
      <p className="truncate text-sm font-medium text-slate-800">
        {locale === "bn" ? notice.titleBn || notice.titleEn : notice.titleEn || notice.titleBn}
      </p>
      <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
        <Badge tone="blue">{notice.category}</Badge>
        {formatDate(notice.publishedAt || notice.createdAt, locale)}
      </p>
    </div>
  );
}

function EventRow({ event }: { event: SchoolEvent }) {
  const { locale } = useI18n();
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
        <CalendarDays className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">{locale === "bn" ? event.titleBn || event.titleEn : event.titleEn || event.titleBn}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {formatDate(event.eventDate, locale)}
          {event.startTime ? ` · ${event.startTime}` : ""}
          {event.location ? ` · ${event.location}` : ""}
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------- Admin ---------------------------------- */

function AdminPanel() {
  const { t, locale, formatNumber } = useI18n();
  const today = todayKey();

  const students = useCollection<Student>("students", { where: [["enrollmentStatus", "==", "active"]], limit: PAGE_LIMIT });
  const teachers = useCollection<Teacher>("teachers", { where: [["status", "==", "active"]], limit: PAGE_LIMIT });
  const classes = useCollection<ClassRoom>("classes", { where: [["isActive", "==", true]], limit: 60 });
  const attendance = useCollection<AttendanceRecord>("attendanceRecords", { where: [["dateKey", "==", today]], limit: PAGE_LIMIT });
  const invoices = useCollection<Invoice>("invoices", { limit: PAGE_LIMIT });
  const applications = useCollection<AdmissionApplication>("admissionApplications", { where: [["status", "==", "pending"]], orderBy: [["createdAt", "desc"]], limit: 5 });
  const results = useCollection<Result>("results", { where: [["publicationStatus", "==", "published"]], limit: PAGE_LIMIT });
  const notices = useCollection<Notice>("notices", { orderBy: [["createdAt", "desc"]], limit: 5 });
  const events = useCollection<SchoolEvent>("events", { where: [["publicationStatus", "==", "published"]], orderBy: [["eventDate", "asc"]], limit: 40 });

  const collected = sumBy(invoices.rows, (invoice) => invoice.paidAmountPaisa);
  const outstanding = sumBy(invoices.rows, (invoice) => invoice.dueAmountPaisa);
  const presentToday = attendance.rows.filter((record) => record.status === "present" || record.status === "late").length;
  const upcomingEvents = events.rows.filter((event) => isUpcoming(event.eventDate)).slice(0, 3);

  const classDistribution = classes.rows.map((item) => ({
    name: locale === "bn" ? item.nameBn || item.name : item.name,
    students: students.rows.filter((student) => student.classId === item.id).length,
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dash.studentsTotal")} value={formatNumber(students.rows.length)} icon={<GraduationCap className="size-5" />} tone="blue" hint={students.hasMore ? `${PAGE_LIMIT}+` : undefined} />
        <StatCard label={t("dash.teachersTotal")} value={formatNumber(teachers.rows.length)} icon={<Users className="size-5" />} tone="navy" />
        <StatCard label={t("dash.classesTotal")} value={formatNumber(classes.rows.length)} icon={<BookOpen className="size-5" />} tone="green" />
        <StatCard
          label={t("dash.attendanceToday")}
          value={`${formatNumber(presentToday)} / ${formatNumber(attendance.rows.length)}`}
          icon={<CalendarCheck className="size-5" />}
          tone={attendance.rows.length === 0 ? "amber" : "green"}
          hint={attendance.rows.length === 0 ? (locale === "bn" ? "আজও উপস্থিতি নেওয়া হয়নি" : "Not marked yet today") : undefined}
        />
        <StatCard label={t("dash.feesCollected")} value={formatMoney(collected, locale)} icon={<Wallet className="size-5" />} tone="green" />
        <StatCard label={t("dash.feesOutstanding")} value={formatMoney(outstanding, locale)} icon={<Receipt className="size-5" />} tone="rose" />
        <StatCard label={t("dash.pendingApplications")} value={formatNumber(applications.total)} icon={<Megaphone className="size-5" />} tone="amber" />
        <StatCard label={t("dash.publishedResults")} value={formatNumber(results.rows.length)} icon={<GraduationCap className="size-5" />} tone="navy" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={locale === "bn" ? "শ্রেণিভিত্তিক শিক্ষার্থী" : "Students per class"} description={locale === "bn" ? "চালু শ্রেণিসমূহ" : "Active classes"} />
          <CardContent>
            {students.loading || classes.loading ? (
              <LoadingBlock label={t("common.loading")} />
            ) : classDistribution.length === 0 ? (
              <EmptyState title={t("empty.noData")} />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classDistribution} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip cursor={{ fill: "rgba(37,99,235,0.06)" }} />
                    <Bar dataKey="students" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <MiniList title={t("dash.recentNotices")} rows={notices.rows} loading={notices.loading} render={(notice) => <NoticeRow notice={notice} />} href="/dashboard/notices/" emptyText={t("home.noticesEmpty")} />
          <MiniList title={t("dash.upcomingEvents")} rows={upcomingEvents} loading={events.loading} render={(event) => <EventRow event={event} />} href="/dashboard/events/" emptyText={t("home.eventsEmpty")} />
        </div>
      </div>

      <Card>
        <CardHeader title={t("dash.quickActions")} />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickAction href="/dashboard/students/" label={t("nav.students")} icon="graduation-cap" />
            <QuickAction href="/dashboard/attendance/" label={t("nav.attendance")} icon="calendar-check" />
            <QuickAction href="/dashboard/exams/" label={t("nav.exams")} icon="file-text" />
            <QuickAction href="/dashboard/fees/" label={t("nav.fees")} icon="receipt" />
            <QuickAction href="/dashboard/notices/" label={t("nav.notices")} icon="megaphone" />
            <QuickAction href="/dashboard/users/" label={t("nav.users")} icon="shield-check" />
            <QuickAction href="/dashboard/reports/" label={t("nav.reports")} icon="bar-chart" />
            <QuickAction href="/dashboard/settings/" label={t("nav.settings")} icon="settings" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* --------------------------------- Teacher --------------------------------- */

function TeacherPanel() {
  const { t, locale, formatNumber } = useI18n();
  const { profile } = useAuth();
  const teacherId = profile?.teacherId ?? null;
  const today = todayKey();

  const teacher = useCollection<Teacher>("teachers", { where: teacherId ? [["id", "==", teacherId]] : undefined, limit: 1, enabled: Boolean(teacherId) });
  const myClasses = teacher.rows[0]?.assignedClasses ?? [];
  const mySubjects = teacher.rows[0]?.assignedSubjects ?? [];

  const students = useCollection<Student>("students", { where: [["enrollmentStatus", "==", "active"]], limit: PAGE_LIMIT });
  const attendance = useCollection<AttendanceRecord>("attendanceRecords", { where: [["dateKey", "==", today]], limit: PAGE_LIMIT });
  const marks = useCollection<Mark>("marks", { where: [["status", "==", "pending"]], limit: PAGE_LIMIT });
  const homework = useCollection<Homework>("homework", { orderBy: [["dueDate", "asc"]], limit: 20 });
  const notices = useCollection<Notice>("notices", { where: [["publicationStatus", "==", "published"]], orderBy: [["createdAt", "desc"]], limit: 5 });

  const myStudents = students.rows.filter((student) => myClasses.includes(student.classId));
  const markedToday = new Set(attendance.rows.map((record) => `${record.classId}:${record.sectionId}`));
  const pendingClasses = myStudents
    .filter((student) => !markedToday.has(`${student.classId}:${student.sectionId}`))
    .map((student) => `${student.classId}/${student.sectionId}`);
  const uniquePending = Array.from(new Set(pendingClasses));
  const myHomework = homework.rows.filter((item) => myClasses.includes(item.classId));
  const pendingMarks = marks.rows.filter((mark) => mySubjects.includes(mark.subjectId));

  const attendanceTrend = lastNDays(7).map((day) => {
    const dayRows = attendance.rows.filter((record) => record.dateKey === day && myClasses.includes(record.classId));
    const present = dayRows.filter((record) => record.status === "present" || record.status === "late").length;
    return { name: day.slice(5), present, absent: dayRows.length - present };
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dash.myClasses")} value={formatNumber(myClasses.length)} icon={<BookOpen className="size-5" />} tone="blue" />
        <StatCard label={locale === "bn" ? "আমার শিক্ষার্থী" : "My students"} value={formatNumber(myStudents.length)} icon={<Users className="size-5" />} tone="navy" />
        <StatCard label={t("dash.pendingMarks")} value={formatNumber(pendingMarks.length)} icon={<GraduationCap className="size-5" />} tone="amber" />
        <StatCard label={t("dash.myHomework")} value={formatNumber(myHomework.length)} icon={<BookOpen className="size-5" />} tone="green" />
      </div>

      {teacherId ? null : (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="text-sm text-amber-900">
            {locale === "bn"
              ? "আপনার প্রোফাইলে কোনো শিক্ষক আইডি যুক্ত নেই, তাই শ্রেণিভিত্তিক তথ্য সীমিত। প্রশাসককে প্রোফাইলে teacherId যুক্ত করতে বলুন।"
              : "No teacherId is linked to your profile, so class-scoped data is limited. Ask an administrator to link your teacher record."}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={t("dash.todayTimetable")} description={uniquePending.length > 0 ? (locale === "bn" ? `${uniquePending.length} শ্রেণির উপস্থিতি বাকি` : `${uniquePending.length} class(es) still to mark`) : (locale === "bn" ? "আজকের উপস্থিতি নেওয়া শেষ" : "Attendance complete for today")} />
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/attendance/">
                <Button size="sm" icon={<CalendarCheck className="size-4" />}>{t("attendance.markTitle")}</Button>
              </Link>
              <Link href="/dashboard/exams/">
                <Button size="sm" variant="outline" icon={<GraduationCap className="size-4" />}>{t("marks.entryTitle")}</Button>
              </Link>
              <Link href="/dashboard/homework/">
                <Button size="sm" variant="outline" icon={<BookOpen className="size-4" />}>{t("nav.homework")}</Button>
              </Link>
            </div>
            <div className="mt-5 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceTrend} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip cursor={{ fill: "rgba(37,99,235,0.06)" }} />
                  <Bar dataKey="present" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="absent" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-slate-500">{t("dash.attendanceTrend")} · {locale === "bn" ? "গত ৭ দিন" : "last 7 days"}</p>
          </CardContent>
        </Card>

        <MiniList title={t("dash.recentNotices")} rows={notices.rows} loading={notices.loading} render={(notice) => <NoticeRow notice={notice} />} href="/dashboard/notices/" emptyText={t("home.noticesEmpty")} />
      </div>

      <MiniList
        title={t("nav.homework")}
        rows={myHomework}
        loading={homework.loading}
        href="/dashboard/homework/"
        emptyText={t("empty.noData")}
        render={(item) => (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{locale === "bn" ? item.titleBn || item.titleEn : item.titleEn || item.titleBn}</p>
              <p className="mt-0.5 text-xs text-slate-500">{locale === "bn" ? "জমার শেষ" : "Due"} {formatDate(item.dueDate, locale)}</p>
            </div>
            <StatusBadge status={item.status} label={t(`status.${item.status}`)} />
          </div>
        )}
      />
    </div>
  );
}

/* -------------------------------- Accountant ------------------------------- */

function AccountantPanel() {
  const { t, locale, formatNumber } = useI18n();
  const payments = useCollection<Payment>("payments", { orderBy: [["createdAt", "desc"]], limit: PAGE_LIMIT });
  const invoices = useCollection<Invoice>("invoices", { limit: PAGE_LIMIT });
  const expenses = useCollection<Expense>("expenses", { orderBy: [["expenseDate", "desc"]], limit: PAGE_LIMIT });

  const verified = payments.rows.filter((payment) => payment.verificationStatus === "verified");
  const queue = payments.rows.filter((payment) => payment.verificationStatus === "unverified");
  const unpaid = invoices.rows.filter((invoice) => invoice.status === "unpaid" || invoice.status === "partial" || invoice.status === "overdue");
  const collected = sumBy(verified, (payment) => payment.amountPaisa);
  const outstanding = sumBy(invoices.rows, (invoice) => invoice.dueAmountPaisa);
  const expenseTotal = sumBy(expenses.rows, (expense) => expense.amountPaisa);
  const thisMonth = monthKey();
  const monthlyCollection = sumBy(
    verified.filter((payment) => payment.createdAt?.slice(0, 7) === thisMonth),
    (payment) => payment.amountPaisa,
  );

  const byMonth: Record<string, number> = {};
  verified.forEach((payment) => {
    const key = (payment.createdAt ?? "").slice(0, 7);
    if (key) byMonth[key] = (byMonth[key] ?? 0) + payment.amountPaisa;
  });
  const chartData = Object.entries(byMonth)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-6)
    .map(([month, amount]) => ({ name: month, amount: amount / 100 }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dash.collections")} value={formatMoney(collected, locale)} icon={<Wallet className="size-5" />} tone="green" hint={locale === "bn" ? `এই মাসে ${formatMoney(monthlyCollection, locale)}` : `${formatMoney(monthlyCollection, locale)} this month`} />
        <StatCard label={t("dash.feesOutstanding")} value={formatMoney(outstanding, locale)} icon={<Receipt className="size-5" />} tone="rose" />
        <StatCard label={t("dash.verificationQueue")} value={formatNumber(queue.length)} icon={<Badge tone="amber">!</Badge>} tone="amber" />
        <StatCard label={t("nav.expenses")} value={formatMoney(expenseTotal, locale)} icon={<Wallet className="size-5" />} tone="navy" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("dash.monthlyCollection")} />
          <CardContent>
            {chartData.length === 0 ? (
              <EmptyState title={t("empty.noData")} />
            ) : (
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip formatter={(value) => formatMoney(Number(value) * 100, locale)} />
                    <Bar dataKey="amount" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title={t("dash.verificationQueue")} description={t("fees.verifiedNote")} action={<Link href="/dashboard/fees/" className="text-xs font-semibold text-royal-700 hover:underline">{t("common.viewAll")}</Link>} />
          <CardContent className="p-0">
            {queue.length === 0 ? (
              <EmptyState title={locale === "bn" ? "যাচাইয়ের অপেক্ষায় কিছু নেই" : "Nothing waiting for verification"} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {queue.slice(0, 5).map((payment) => (
                  <li key={payment.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{payment.method.toUpperCase()} · {payment.transactionReference || "—"}</p>
                      <p className="text-xs text-slate-500">{formatDate(payment.createdAt, locale)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">{formatMoney(payment.amountPaisa, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <MiniList
        title={locale === "bn" ? "বকেয়া চালান" : "Outstanding invoices"}
        rows={unpaid.slice(0, 6)}
        loading={invoices.loading}
        href="/dashboard/fees/"
        emptyText={locale === "bn" ? "কোনো বকেয়া নেই" : "No outstanding invoices"}
        render={(invoice) => (
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{invoice.period} · {invoice.feeType}</p>
              <p className="text-xs text-slate-500">{locale === "bn" ? "শেষ তারিখ" : "Due"} {formatDate(invoice.dueDate, locale)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tabular-nums text-rose-700">{formatMoney(invoice.dueAmountPaisa, locale)}</span>
              <StatusBadge status={invoice.status} label={t(`status.${invoice.status}`)} />
            </div>
          </div>
        )}
      />
    </div>
  );
}

/* -------------------------------- Librarian -------------------------------- */

function LibrarianPanel() {
  const { t, locale, formatNumber } = useI18n();
  const books = useCollection<Book>("books", { limit: PAGE_LIMIT });
  const transactions = useCollection<LibraryTransaction>("libraryTransactions", { orderBy: [["issuedAt", "desc"]], limit: PAGE_LIMIT });
  const today = todayKey();

  const issued = transactions.rows.filter((item) => item.status !== "returned");
  const overdue = issued.filter((item) => item.dueDate < today);
  const totalCopies = sumBy(books.rows, (book) => book.totalCopies);
  const available = sumBy(books.rows, (book) => book.availableCopies);

  const pieData = [
    { name: locale === "bn" ? "সহজলভ্য" : "Available", value: available, fill: "#10B981" },
    { name: locale === "bn" ? "ছাড়া" : "Issued", value: Math.max(0, totalCopies - available), fill: "#2563EB" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={locale === "bn" ? "বইয়ের শিরোনাম" : "Titles"} value={formatNumber(books.rows.length)} icon={<BookOpen className="size-5" />} tone="blue" />
        <StatCard label={t("dash.booksIssued")} value={formatNumber(issued.length)} icon={<BookOpen className="size-5" />} tone="navy" />
        <StatCard label={t("dash.overdue")} value={formatNumber(overdue.length)} icon={<CalendarDays className="size-5" />} tone="rose" />
        <StatCard label={locale === "bn" ? "মোট কপি" : "Total copies"} value={formatNumber(totalCopies)} icon={<BookOpen className="size-5" />} tone="green" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title={locale === "bn" ? "কপির অবস্থা" : "Copy availability"} />
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <MiniList
          title={locale === "bn" ? "সাম্প্রতিক লেনদেন" : "Recent transactions"}
          rows={transactions.rows.slice(0, 6)}
          loading={transactions.loading}
          href="/dashboard/library/"
          emptyText={t("empty.noData")}
          render={(item) => (
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{item.memberName}</p>
                <p className="text-xs text-slate-500">{locale === "bn" ? "ফেরতের তারিখ" : "Due"} {formatDate(item.dueDate, locale)}</p>
              </div>
              <StatusBadge status={item.dueDate < today && item.status !== "returned" ? "overdue" : item.status} label={t(`status.${item.status}`)} />
            </div>
          )}
        />
      </div>
    </div>
  );
}

/* --------------------------------- Student --------------------------------- */

function StudentPanel({ studentIds }: { studentIds: string[] }) {
  const { t, locale, formatNumber } = useI18n();
  const primary = studentIds[0] ?? null;
  const students = useCollection<Student>("students", { where: [["id", "==", primary ?? ""]], limit: studentIds.length || 1, enabled: Boolean(primary) });
  const attendance = useCollection<AttendanceRecord>("attendanceRecords", { where: primary ? [["studentId", "==", primary]] : undefined, orderBy: [["dateKey", "desc"]], limit: 120, enabled: Boolean(primary) });
  const results = useCollection<Result>("results", { where: [["publicationStatus", "==", "published"]], limit: 60 });
  const homework = useCollection<Homework>("homework", { where: [["status", "==", "published"]], orderBy: [["dueDate", "asc"]], limit: 20 });
  const invoices = useCollection<Invoice>("invoices", { limit: PAGE_LIMIT });
  const notices = useCollection<Notice>("notices", { where: [["publicationStatus", "==", "published"], ["visibility", "in", ["public", "students"]]], orderBy: [["createdAt", "desc"]], limit: 5 });

  const student = students.rows.find((item) => studentIds.includes(item.id)) ?? null;
  const present = attendance.rows.filter((record) => record.status === "present" || record.status === "late").length;
  const attendanceRate = attendance.rows.length > 0 ? Math.round((present / attendance.rows.length) * 100) : 0;
  const myResults = results.rows.filter((result) => studentIds.includes(result.studentId));
  const myInvoices = invoices.rows.filter((invoice) => studentIds.includes(invoice.studentId));
  const due = sumBy(myInvoices, (invoice) => invoice.dueAmountPaisa);
  const myHomework = homework.rows.filter((item) => !student || item.classId === student.classId);

  return (
    <div className="space-y-5">
      {student ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Avatar name={student.fullNameBn || student.fullName} src={student.photoUrl} size="lg" />
            <div className="min-w-0">
              <p className="bn text-lg font-semibold text-navy-700">{student.fullNameBn || student.fullName}</p>
              <p className="text-sm text-slate-500">
                {locale === "bn" ? "ভর্তি নম্বর" : "Admission no."} {student.admissionNo} · {locale === "bn" ? "রোল" : "Roll"} {student.rollNo}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <Link href="/dashboard/profile/"><Button size="sm" variant="outline">{t("nav.profile")}</Button></Link>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dash.attendanceToday")} value={`${attendanceRate}%`} icon={<CalendarCheck className="size-5" />} tone={attendanceRate >= 85 ? "green" : "amber"} hint={locale === "bn" ? `গত ${attendance.rows.length} দিনের রেকর্ড` : `last ${attendance.rows.length} records`} />
        <StatCard label={t("dash.myResults")} value={formatNumber(myResults.length)} icon={<GraduationCap className="size-5" />} tone="blue" />
        <StatCard label={t("dash.myHomework")} value={formatNumber(myHomework.length)} icon={<BookOpen className="size-5" />} tone="navy" />
        <StatCard label={t("dash.myFees")} value={formatMoney(due, locale)} icon={<Receipt className="size-5" />} tone={due > 0 ? "rose" : "green"} hint={due > 0 ? (locale === "bn" ? "বকেয়া রয়েছে" : "Balance due") : (locale === "bn" ? "বকেয়া নেই" : "Nothing due")} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <MiniList
          title={t("dash.myResults")}
          rows={myResults.slice(0, 5)}
          loading={results.loading}
          href="/dashboard/results/"
          emptyText={t("results.publishedOnly")}
          render={(result) => (
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{result.examId}</p>
                <p className="text-xs text-slate-500">{formatDate(result.publishedAt ?? result.createdAt, locale)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="blue">GPA {result.gpa}</Badge>
                <StatusBadge status={result.status} label={t(`status.${result.status}`)} />
              </div>
            </div>
          )}
        />
        <MiniList title={t("dash.recentNotices")} rows={notices.rows} loading={notices.loading} render={(notice) => <NoticeRow notice={notice} />} href="/dashboard/notices/" emptyText={t("home.noticesEmpty")} />
      </div>
    </div>
  );
}

/* --------------------------------- Parent ---------------------------------- */

function ParentPanel({ studentIds }: { studentIds: string[] }) {
  const { t, locale, formatNumber } = useI18n();
  const children = useCollection<Student>("students", { limit: PAGE_LIMIT });
  const invoices = useCollection<Invoice>("invoices", { limit: PAGE_LIMIT });
  const results = useCollection<Result>("results", { where: [["publicationStatus", "==", "published"]], limit: 100 });
  const notices = useCollection<Notice>("notices", { where: [["publicationStatus", "==", "published"], ["visibility", "in", ["public", "parents"]]], orderBy: [["createdAt", "desc"]], limit: 5 });
  const events = useCollection<SchoolEvent>("events", { where: [["publicationStatus", "==", "published"]], orderBy: [["eventDate", "asc"]], limit: 30 });

  const linked = children.rows.filter((student) => studentIds.includes(student.id));
  const dueTotal = sumBy(invoices.rows.filter((invoice) => studentIds.includes(invoice.studentId)), (invoice) => invoice.dueAmountPaisa);
  const upcoming = events.rows.filter((event) => isUpcoming(event.eventDate)).slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dash.myChildren")} value={formatNumber(linked.length)} icon={<Users className="size-5" />} tone="blue" />
        <StatCard label={t("dash.myResults")} value={formatNumber(results.rows.filter((result) => studentIds.includes(result.studentId)).length)} icon={<GraduationCap className="size-5" />} tone="green" />
        <StatCard label={t("dash.myFees")} value={formatMoney(dueTotal, locale)} icon={<Receipt className="size-5" />} tone={dueTotal > 0 ? "rose" : "green"} />
        <StatCard label={t("dash.upcomingEvents")} value={formatNumber(upcoming.length)} icon={<CalendarDays className="size-5" />} tone="amber" />
      </div>

      {linked.length === 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="text-sm text-amber-900">
            {locale === "bn"
              ? "আপনার অ্যাকাউন্টের সাথে কোনো শিক্ষার্থী যুক্ত নেই। প্রশাসককে অভিভাবক সংযোগ যুক্ত করতে বলুন।"
              : "No student is linked to your account yet. Ask the administrator to add the guardian link."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {linked.map((child) => {
            const childDue = sumBy(invoices.rows.filter((invoice) => invoice.studentId === child.id), (invoice) => invoice.dueAmountPaisa);
            const childResults = results.rows.filter((result) => result.studentId === child.id);
            return (
              <Card key={child.id} className="p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={child.fullNameBn || child.fullName} src={child.photoUrl} />
                  <div className="min-w-0">
                    <p className="bn truncate text-sm font-semibold text-slate-900">{child.fullNameBn || child.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{child.admissionNo} · {locale === "bn" ? "রোল" : "Roll"} {child.rollNo}</p>
                  </div>
                </div>
                <dl className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between"><dt>{t("dash.myFees")}</dt><dd className="font-semibold tabular-nums">{formatMoney(childDue, locale)}</dd></div>
                  <div className="flex justify-between"><dt>{t("dash.myResults")}</dt><dd className="font-semibold">{childResults.length}</dd></div>
                </dl>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <MiniList title={t("dash.recentNotices")} rows={notices.rows} loading={notices.loading} render={(notice) => <NoticeRow notice={notice} />} href="/dashboard/notices/" emptyText={t("home.noticesEmpty")} />
        <MiniList title={t("dash.upcomingEvents")} rows={upcoming} loading={events.loading} render={(event) => <EventRow event={event} />} href="/dashboard/events/" emptyText={t("home.eventsEmpty")} />
      </div>
    </div>
  );
}

/* ---------------------------------- Router --------------------------------- */

export function RoleDashboard() {
  const { t, locale } = useI18n();
  const { profile, role } = useAuth();
  const { settings } = useSchool();

  if (!profile) return <LoadingBlock label={t("common.loading")} />;

  const studentIds =
    role === "student"
      ? profile.studentId
        ? [profile.studentId]
        : []
      : role === "parent"
        ? profile.guardianStudentIds ?? []
        : [];

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-card border border-slate-200 bg-white px-5 py-4 shadow-card">
        <div>
          <p className="text-sm text-slate-500">{t("dash.welcome")},</p>
          <h2 className="bn text-lg font-bold text-navy-700">{locale === "bn" ? profile.displayNameBn || profile.displayName : profile.displayName}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <StatusBadge status={profile.status} label={t(`status.${profile.status}`)} />
          <Badge tone="navy">{t(`role.${role}`)}</Badge>
          {settings?.currentSessionId ? <Badge tone="neutral">{settings.currentSessionId}</Badge> : null}
          {can(role, "reports.view" as Capability) ? (
            <Link href="/dashboard/reports/"><Button size="sm" variant="outline">{t("nav.reports")}</Button></Link>
          ) : null}
        </div>
      </div>

      {role === "admin" ? <AdminPanel /> : null}
      {role === "teacher" ? <TeacherPanel /> : null}
      {role === "accountant" ? <AccountantPanel /> : null}
      {role === "librarian" ? <LibrarianPanel /> : null}
      {role === "student" ? <StudentPanel studentIds={studentIds} /> : null}
      {role === "parent" ? <ParentPanel studentIds={studentIds} /> : null}
    </div>
  );
}
