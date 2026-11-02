"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarClock, RotateCcw, Share2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCollection } from "@/hooks/useCollection";
import { createDoc, getDocById, listDocs, updateDocById } from "@/lib/data/store";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { addDays, daysBetween, formatDate, todayKey } from "@/lib/utils/date";
import { formatMoney } from "@/lib/utils/money";
import { describeError } from "@/lib/utils/cn";
import { can, type Capability } from "@/lib/permissions";
import { AccessDenied, ModulePage } from "@/features/crud/ModulePage";
import { MODULES } from "@/features/modules/registry";
import { ModulePanel } from "@/features/crud/ModulePanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Badge, Button, Card, CardContent, CardHeader, Field, Input, Select, StatCard, StatusBadge } from "@/components/ui/primitives";
import { Dialog, useToast } from "@/components/ui/overlays";
import { EmptyState, LoadingBlock, Tabs } from "@/components/ui/feedback";
import type { Book, LibraryTransaction, Student, Teacher } from "@/types";

/** Configurable in a real deployment; kept explicit so fines are never silent. */
export const FINE_PER_DAY_PAISA = 200;
const DEFAULT_LOAN_DAYS = 14;

export default function LibraryPage() {
  const { t, locale, formatNumber } = useI18n();
  const toast = useToast();
  const { profile, role } = useAuth();
  const [tab, setTab] = useState<"catalog" | "transactions">("catalog");

  const canManage = can(role, "library.manage" as Capability);
  const books = useCollection<Book>("books", { orderBy: [["bookCode", "asc"]], limit: 300 });
  const students = useCollection<Student>("students", { where: [["enrollmentStatus", "==", "active"]], limit: 500 });
  const teachers = useCollection<Teacher>("teachers", { limit: 100 });
  const [transactions, setTransactions] = useState<LibraryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [issueOpen, setIssueOpen] = useState(false);
  const [bookId, setBookId] = useState("");
  const [memberType, setMemberType] = useState<"student" | "teacher" | "staff">("student");
  const [memberId, setMemberId] = useState("");
  const [dueDate, setDueDate] = useState(addDays(todayKey(), DEFAULT_LOAN_DAYS));
  const [busy, setBusy] = useState(false);

  async function loadTransactions() {
    setLoading(true);
    try {
      const result = await listDocs<LibraryTransaction>("libraryTransactions", { orderBy: [["issuedAt", "desc"]], limit: 300 });
      setTransactions(result.rows);
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = todayKey();
  const stats = useMemo(() => {
    const issued = transactions.filter((item) => item.status !== "returned");
    const overdue = issued.filter((item) => item.dueDate < today);
    return {
      titles: books.rows.length,
      copies: books.rows.reduce((sum, book) => sum + (book.totalCopies || 0), 0),
      issued: issued.length,
      overdue: overdue.length,
      fines: transactions.reduce((sum, item) => sum + (item.finePaisa || 0), 0),
    };
  }, [transactions, books.rows, today]);

  const bookTitle = (id: string) => {
    const book = books.rows.find((item) => item.id === id);
    return book ? (locale === "bn" ? book.titleBn || book.title : book.title) : id;
  };

  async function issueBook() {
    if (!bookId || !memberId) {
      toast.error(t("error.title"), t("validation.required"));
      return;
    }
    setBusy(true);
    try {
      // Re-read the book immediately before writing so two librarians cannot
      // over-issue the same copy.
      const fresh = await getDocById<Book>("books", bookId);
      if (!fresh) throw new Error("not-found");
      if ((fresh.availableCopies ?? 0) <= 0) {
        toast.error(t("library.noCopies"));
        return;
      }
      const memberName =
        memberType === "student"
          ? students.rows.find((item) => item.id === memberId)?.fullName ?? memberId
          : teachers.rows.find((item) => item.id === memberId)?.name ?? memberId;

      await updateDocById("books", bookId, { availableCopies: fresh.availableCopies - 1 });
      await createDoc<Omit<LibraryTransaction, "id" | "createdAt" | "updatedAt">>("libraryTransactions", {
        schoolId: SCHOOL_ID,
        bookId,
        memberUserId: memberId,
        memberName,
        memberType,
        issuedAt: today,
        dueDate,
        finePaisa: 0,
        status: "issued",
        issuedBy: profile?.uid ?? "unknown",
      });
      toast.success(locale === "bn" ? "বই ছাড়া হয়েছে" : "Book issued", `${bookTitle(bookId)} → ${memberName}`);
      setIssueOpen(false);
      setBookId("");
      setMemberId("");
      books.reload();
      await loadTransactions();
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function returnBook(transaction: LibraryTransaction) {
    setBusy(true);
    try {
      const book = await getDocById<Book>("books", transaction.bookId);
      const overdueDays = transaction.dueDate < today ? daysBetween(transaction.dueDate, today) : 0;
      const fine = overdueDays > 0 ? overdueDays * FINE_PER_DAY_PAISA : 0;
      await updateDocById("libraryTransactions", transaction.id, {
        returnedAt: today,
        status: "returned",
        finePaisa: fine,
      });
      if (book) {
        await updateDocById("books", book.id, { availableCopies: Math.min(book.totalCopies, (book.availableCopies ?? 0) + 1) });
      }
      toast.success(
        locale === "bn" ? "বই ফেরত নেওয়া হয়েছে" : "Book returned",
        fine > 0 ? `${locale === "bn" ? "জরিমানা" : "Fine"}: ${formatMoney(fine, locale)}` : undefined,
      );
      books.reload();
      await loadTransactions();
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!can(role, "library.view" as Capability)) return <AccessDenied capability="library.view" />;

  const availableBooks = books.rows.filter((book) => (book.availableCopies ?? 0) > 0);

  return (
    <>
      <DashboardPageHeader title={t("nav.library")} description={locale === "bn" ? "বইয়ের ক্যাটালগ, ছাড়া ও ফেরত, জরিমানা।" : "Catalogue, issue/return and fines."} />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={locale === "bn" ? "শিরোনাম" : "Titles"} value={formatNumber(stats.titles)} icon={<BookOpen className="size-5" />} tone="blue" />
        <StatCard label={locale === "bn" ? "মোট কপি" : "Copies"} value={formatNumber(stats.copies)} tone="navy" />
        <StatCard label={t("dash.booksIssued")} value={formatNumber(stats.issued)} icon={<Share2 className="size-5" />} tone="green" />
        <StatCard label={t("dash.overdue")} value={formatNumber(stats.overdue)} icon={<CalendarClock className="size-5" />} tone="rose" hint={stats.fines > 0 ? `${locale === "bn" ? "জরিমানা" : "Fines"} ${formatMoney(stats.fines, locale)}` : undefined} />
      </div>

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "catalog", label: locale === "bn" ? "ক্যাটালগ" : "Catalogue" },
          { id: "transactions", label: locale === "bn" ? "লেনদেন" : "Transactions", count: transactions.length },
        ]}
        className="max-w-md"
      />

      <div className="mt-4">
        {tab === "catalog" ? (
          canManage ? (
            <ModulePanel module={MODULES.books} />
          ) : (
            <Card>
              <CardContent className="p-0">
                {books.loading ? (
                  <LoadingBlock label={t("common.loading")} />
                ) : books.rows.length === 0 ? (
                  <EmptyState title={t("empty.noData")} />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {books.rows.map((book) => (
                      <li key={book.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div className="min-w-0">
                          <p className="bn truncate text-sm font-medium text-slate-800">{book.titleBn || book.title}</p>
                          <p className="text-xs text-slate-500">{book.bookCode} · {book.category}{book.author ? ` · ${book.author}` : ""}</p>
                        </div>
                        <Badge tone={book.availableCopies > 0 ? "green" : "rose"}>
                          {book.availableCopies}/{book.totalCopies}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )
        ) : (
          <Card>
            <CardHeader
              title={locale === "bn" ? "লেনদেন" : "Transactions"}
              action={canManage ? <Button size="sm" icon={<Share2 className="size-4" />} onClick={() => setIssueOpen(true)}>{t("library.issue")}</Button> : undefined}
            />
            {loading ? (
              <LoadingBlock label={t("common.loading")} />
            ) : transactions.length === 0 ? (
              <EmptyState title={t("empty.title")} body={t("empty.body")} />
            ) : (
              <CardContent className="p-0">
                <div className="scroll-thin overflow-x-auto">
                  <table className="w-full min-w-[46rem] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2 text-left">{locale === "bn" ? "বই" : "Book"}</th>
                        <th className="px-4 py-2 text-left">{locale === "bn" ? "সদস্য" : "Member"}</th>
                        <th className="px-4 py-2 text-left">{locale === "bn" ? "ছাড়ার তারিখ" : "Issued"}</th>
                        <th className="px-4 py-2 text-left">{locale === "bn" ? "ফেরতের তারিখ" : "Due"}</th>
                        <th className="px-4 py-2 text-right">{locale === "bn" ? "জরিমানা" : "Fine"}</th>
                        <th className="px-4 py-2 text-center">{t("common.status")}</th>
                        {canManage ? <th className="px-4 py-2 text-right">{t("common.actions")}</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction) => {
                        const overdue = transaction.status !== "returned" && transaction.dueDate < today;
                        return (
                          <tr key={transaction.id} className="border-b border-slate-100 last:border-0">
                            <td className="bn px-4 py-2.5 font-medium text-slate-800">{bookTitle(transaction.bookId)}</td>
                            <td className="px-4 py-2.5 text-slate-700">{transaction.memberName} <Badge tone="neutral">{transaction.memberType}</Badge></td>
                            <td className="px-4 py-2.5 tabular-nums text-slate-600">{formatDate(transaction.issuedAt, locale)}</td>
                            <td className="px-4 py-2.5 tabular-nums text-slate-600">{formatDate(transaction.dueDate, locale)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{transaction.finePaisa ? formatMoney(transaction.finePaisa, locale) : "—"}</td>
                            <td className="px-4 py-2.5 text-center"><StatusBadge status={overdue ? "overdue" : transaction.status} label={t(`status.${overdue ? "overdue" : transaction.status}`)} /></td>
                            {canManage ? (
                              <td className="px-4 py-2.5 text-right">
                                {transaction.status !== "returned" ? (
                                  <Button size="sm" variant="outline" icon={<RotateCcw className="size-3.5" />} loading={busy} onClick={() => void returnBook(transaction)}>
                                    {t("library.return")}
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-400">{formatDate(transaction.returnedAt, locale)}</span>
                                )}
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>

      <Dialog
        open={issueOpen}
        onClose={() => setIssueOpen(false)}
        title={t("library.issue")}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setIssueOpen(false)} disabled={busy}>{t("common.cancel")}</Button>
            <Button onClick={issueBook} loading={busy} disabled={availableBooks.length === 0}>{t("library.issue")}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={locale === "bn" ? "বই" : "Book"} htmlFor="lib-book" required className="sm:col-span-2">
            <Select id="lib-book" value={bookId} onChange={(event) => setBookId(event.target.value)}>
              <option value="">{availableBooks.length === 0 ? t("library.noCopies") : locale === "bn" ? "নির্বাচন করুন" : "Select…"}</option>
              {availableBooks.map((book) => (
                <option key={book.id} value={book.id}>
                  {locale === "bn" ? book.titleBn || book.title : book.title} ({book.availableCopies})
                </option>
              ))}
            </Select>
          </Field>
          <Field label={locale === "bn" ? "সদস্যের ধরন" : "Member type"} htmlFor="lib-type">
            <Select id="lib-type" value={memberType} onChange={(event) => { setMemberType(event.target.value as typeof memberType); setMemberId(""); }}>
              <option value="student">{t("role.student")}</option>
              <option value="teacher">{t("role.teacher")}</option>
              <option value="staff">{t("nav.staff")}</option>
            </Select>
          </Field>
          <Field label={locale === "bn" ? "সদস্য" : "Member"} htmlFor="lib-member" required>
            <Select id="lib-member" value={memberId} onChange={(event) => setMemberId(event.target.value)}>
              <option value="">{locale === "bn" ? "নির্বাচন করুন" : "Select…"}</option>
              {(memberType === "student" ? students.rows : teachers.rows).map((member) => {
                const value = member.id;
                const label = memberType === "student"
                  ? `${(member as Student).fullName}${(member as Student).admissionNo ? ` · ${(member as Student).admissionNo}` : ""}`
                  : (member as Teacher).name;
                return <option key={value} value={value}>{label}</option>;
              })}
            </Select>
          </Field>
          <Field label={locale === "bn" ? "ফেরতের শেষ তারিখ" : "Due date"} htmlFor="lib-due" className="sm:col-span-2">
            <Input id="lib-due" type="date" value={dueDate} min={todayKey()} onChange={(event) => setDueDate(event.target.value)} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {locale === "bn"
            ? `বিলম্বিত ফেরতের জরিমানা প্রতিদিন ${formatMoney(FINE_PER_DAY_PAISA, locale)}।`
            : `Late returns accrue ${formatMoney(FINE_PER_DAY_PAISA, locale)} per day.`}
        </p>
      </Dialog>
    </>
  );
}
