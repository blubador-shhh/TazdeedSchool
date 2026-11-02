"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Printer, Receipt as ReceiptIcon, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSchool } from "@/features/settings/SchoolProvider";
import { useCollection } from "@/hooks/useCollection";
import { useLookups } from "@/hooks/useLookups";
import { createDoc, listDocs, nextSequence, updateDocById } from "@/lib/data/store";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { formatMoney, formatReceiptNo, reconcileInvoice, toPaisa, validatePaymentAmount } from "@/lib/utils/money";
import { describeError } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { can, type Capability } from "@/lib/permissions";
import { AccessDenied, ModulePage } from "@/features/crud/ModulePage";
import { MODULES } from "@/features/modules/registry";
import { ModulePanel } from "@/features/crud/ModulePanel";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Badge, Button, Card, CardContent, CardHeader, Checkbox, Field, Input, Select, StatCard, StatusBadge, Textarea } from "@/components/ui/primitives";
import { Dialog, useToast } from "@/components/ui/overlays";
import { EmptyState, LoadingBlock, Tabs } from "@/components/ui/feedback";
import { FeeReceipt, PrintToolbar } from "@/components/print/templates";
import type { Invoice, Payment, PaymentMethod, Student } from "@/types";

const METHODS: PaymentMethod[] = ["cash", "bkash", "nagad", "rocket", "bank", "other"];

export default function FeesPage() {
  const { t, locale, formatNumber } = useI18n();
  const toast = useToast();
  const { profile, role } = useAuth();
  const { settings } = useSchool();
  const lookups = useLookups({ sections: false, subjects: false });

  const [tab, setTab] = useState<"invoices" | "payments" | "structures">("invoices");
  const [payingFor, setPayingFor] = useState<Invoice | null>(null);
  const [receiptFor, setReceiptFor] = useState<{ invoice: Invoice; payments: Payment[] } | null>(null);
  const [amountTaka, setAmountTaka] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [verifyNow, setVerifyNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const invoices = useCollection<Invoice>("invoices", { orderBy: [["createdAt", "desc"]], limit: 500 });

  const canVerify = can(role, "fees.verify" as Capability);
  const canManage = can(role, "fees.manage" as Capability);

  async function loadPayments() {
    setLoadingPayments(true);
    try {
      const result = await listDocs<Payment>("payments", { orderBy: [["createdAt", "desc"]], limit: 500 });
      setPayments(result.rows);
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setLoadingPayments(false);
    }
  }

  useEffect(() => {
    void loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const totals = useMemo(() => {
    const collected = invoices.rows.reduce((sum, invoice) => sum + (invoice.paidAmountPaisa || 0), 0);
    const due = invoices.rows.reduce((sum, invoice) => sum + (invoice.dueAmountPaisa || 0), 0);
    const queue = payments.filter((payment) => payment.verificationStatus === "unverified").length;
    return { collected, due, queue };
  }, [invoices.rows, payments]);

  function studentOf(invoice: Invoice): Student | null {
    return lookups.students[invoice.studentId] ?? null;
  }

  function classNameOf(invoice: Invoice): string {
    const student = studentOf(invoice);
    const found = student ? lookups.classes[student.classId] : null;
    return found ? (locale === "bn" ? found.nameBn || found.name : found.name) : "—";
  }

  async function submitPayment() {
    if (!payingFor) return;
    const amountPaisa = toPaisa(amountTaka);
    const validation = validatePaymentAmount(amountPaisa, payingFor);
    if (!validation.ok) {
      toast.error(t("error.title"), validation.message);
      return;
    }
    if (method !== "cash" && !reference.trim()) {
      toast.error(t("error.title"), locale === "bn" ? "ট্রান্সেকশন রেফারেন্স দিন।" : "Provide the transaction reference.");
      return;
    }
    setBusy(true);
    try {
      const verified = canVerify && (method === "cash" ? verifyNow : verifyNow);
      const stamp = new Date().toISOString();
      const paymentId = await createDoc<Omit<Payment, "id" | "createdAt" | "updatedAt">>(
        "payments",
        {
          schoolId: SCHOOL_ID,
          invoiceId: payingFor.id,
          studentId: payingFor.studentId,
          amountPaisa,
          method,
          transactionReference: reference.trim() || undefined,
          verificationStatus: verified ? "verified" : "unverified",
          receivedBy: profile?.uid ?? "unknown",
          verifiedBy: verified ? profile?.uid : undefined,
          verifiedAt: verified ? stamp : undefined,
          note: note.trim() || undefined,
        },
      );

      const related = payments.filter((payment) => payment.invoiceId === payingFor.id);
      const withNew: Pick<Payment, "amountPaisa" | "verificationStatus">[] = [
        ...related.map((payment) => ({ amountPaisa: payment.amountPaisa, verificationStatus: payment.verificationStatus })),
        { amountPaisa, verificationStatus: verified ? "verified" : "unverified" },
      ];
      const reconciled = reconcileInvoice(payingFor, withNew);
      const patch: Record<string, unknown> = { ...reconciled };

      if (reconciled.paidAmountPaisa > 0 && !payingFor.receiptNo) {
        const sequence = await nextSequence(`receipts-${new Date().getFullYear()}`);
        patch.receiptNo = formatReceiptNo(sequence, new Date().getFullYear());
      }
      await updateDocById("invoices", payingFor.id, patch);

      toast.success(
        verified ? (locale === "bn" ? "পেমেন্ট যাচাইকৃত ও সংরক্ষিত" : "Payment recorded and verified") : locale === "bn" ? "পেমেন্ট সংরক্ষিত (অযাচাইকৃত)" : "Payment recorded (unverified)",
        `${formatMoney(amountPaisa, locale)} · ${paymentId.slice(0, 8)}`,
      );
      setPayingFor(null);
      setAmountTaka("");
      setReference("");
      setNote("");
      setVerifyNow(false);
      invoices.reload();
      await loadPayments();
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function setVerification(payment: Payment, status: "verified" | "rejected") {
    setBusy(true);
    try {
      await updateDocById("payments", payment.id, {
        verificationStatus: status,
        verifiedBy: status === "verified" ? profile?.uid : payment.verifiedBy,
        verifiedAt: status === "verified" ? new Date().toISOString() : payment.verifiedAt,
      });
      const invoice = invoices.rows.find((item) => item.id === payment.invoiceId);
      if (invoice) {
        const updated = payments.map((item) => (item.id === payment.id ? { ...item, verificationStatus: status } : item));
        await updateDocById("invoices", invoice.id, reconcileInvoice(invoice, updated.filter((item) => item.invoiceId === invoice.id)));
      }
      toast.success(status === "verified" ? (locale === "bn" ? "যাচাই সম্পন্ন" : "Payment verified") : locale === "bn" ? "প্রত্যাখ্যান করা হয়েছে" : "Payment rejected");
      invoices.reload();
      await loadPayments();
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!can(role, "fees.view" as Capability) && !can(role, "fees.viewOwn" as Capability)) {
    return <AccessDenied capability="fees.view" />;
  }

  const ownIds = role === "student" ? (profile?.studentId ? [profile.studentId] : []) : role === "parent" ? profile?.guardianStudentIds ?? [] : null;
  const scopedInvoices = ownIds ? invoices.rows.filter((invoice) => ownIds.includes(invoice.studentId)) : invoices.rows;

  return (
    <>
      <DashboardPageHeader
        title={t("nav.fees")}
        description={t("fees.verifiedNote")}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dash.collections")} value={formatMoney(totals.collected, locale)} icon={<Wallet className="size-5" />} tone="green" />
        <StatCard label={t("dash.feesOutstanding")} value={formatMoney(totals.due, locale)} icon={<ReceiptIcon className="size-5" />} tone="rose" />
        <StatCard label={t("dash.verificationQueue")} value={formatNumber(totals.queue)} icon={<BadgeCheck className="size-5" />} tone="amber" />
        <StatCard label={locale === "bn" ? "চালান" : "Invoices"} value={formatNumber(invoices.rows.length)} tone="navy" />
      </div>

      <Tabs
        active={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: "invoices", label: locale === "bn" ? "চালান" : "Invoices" },
          { id: "payments", label: locale === "bn" ? "পেমেন্ট" : "Payments" },
          { id: "structures", label: locale === "bn" ? "ফি কাঠামো" : "Fee structures" },
        ]}
        className="max-w-lg"
      />

      <div className="mt-4">
        {tab === "structures" ? (
          <ModulePanel module={MODULES.feeStructures} />
        ) : tab === "invoices" ? (
          <Card>
            <CardHeader title={locale === "bn" ? "চালান তালিকা" : "Invoices"} description={`${scopedInvoices.length}`} />
            {invoices.loading ? (
              <LoadingBlock label={t("common.loading")} />
            ) : scopedInvoices.length === 0 ? (
              <EmptyState title={t("empty.title")} body={t("empty.body")} />
            ) : (
              <CardContent className="p-0">
                <div className="scroll-thin overflow-x-auto">
                  <table className="w-full min-w-[52rem] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2 text-left">{locale === "bn" ? "শিক্ষার্থী" : "Student"}</th>
                        <th className="hidden px-4 py-2 text-left sm:table-cell">{t("common.class")}</th>
                        <th className="px-4 py-2 text-left">{locale === "bn" ? "সময়কাল" : "Period"}</th>
                        <th className="px-4 py-2 text-right">{t("common.amount")}</th>
                        <th className="px-4 py-2 text-right">{t("common.paid")}</th>
                        <th className="px-4 py-2 text-right">{t("common.due")}</th>
                        <th className="px-4 py-2 text-center">{t("common.status")}</th>
                        <th className="px-4 py-2 text-right">{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scopedInvoices.map((invoice) => {
                        const student = studentOf(invoice);
                        return (
                          <tr key={invoice.id} className="border-b border-slate-100 last:border-0 hover:bg-royal-50/40">
                            <td className="bn px-4 py-2.5 font-medium text-slate-800">
                              {student ? student.fullNameBn || student.fullName : invoice.studentId}
                              {student ? <span className="ml-2 text-xs font-normal text-slate-500">{student.admissionNo}</span> : null}
                            </td>
                            <td className="hidden px-4 py-2.5 text-slate-600 sm:table-cell">{classNameOf(invoice)}</td>
                            <td className="px-4 py-2.5 text-slate-600">{invoice.period}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(invoice.amountPaisa - invoice.discountPaisa, locale)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{formatMoney(invoice.paidAmountPaisa, locale)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-rose-700">{formatMoney(invoice.dueAmountPaisa, locale)}</td>
                            <td className="px-4 py-2.5 text-center"><StatusBadge status={invoice.status} label={t(`status.${invoice.status}`)} /></td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center justify-end gap-1.5">
                                {canManage && invoice.dueAmountPaisa > 0 ? (
                                  <Button size="sm" icon={<Wallet className="size-3.5" />} onClick={() => { setPayingFor(invoice); setAmountTaka(String(invoice.dueAmountPaisa / 100)); }}>
                                    {t("fees.recordPayment")}
                                  </Button>
                                ) : null}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  icon={<Printer className="size-3.5" />}
                                  onClick={() => setReceiptFor({ invoice, payments: payments.filter((payment) => payment.invoiceId === invoice.id && payment.verificationStatus === "verified") })}
                                >
                                  {t("fees.receipt")}
                                </Button>
                              </div>
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
        ) : (
          <Card>
            <CardHeader
              title={locale === "bn" ? "পেমেন্ট লেজার" : "Payment ledger"}
              description={t("fees.verifiedNote")}
              action={<Button size="sm" variant="outline" onClick={() => void loadPayments()}>↻</Button>}
            />
            {loadingPayments ? (
              <LoadingBlock label={t("common.loading")} />
            ) : payments.length === 0 ? (
              <EmptyState title={t("empty.title")} body={t("empty.body")} />
            ) : (
              <CardContent className="p-0">
                <div className="scroll-thin overflow-x-auto">
                  <table className="w-full min-w-[48rem] text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2 text-left">{t("common.date")}</th>
                        <th className="px-4 py-2 text-left">{locale === "bn" ? "শিক্ষার্থী" : "Student"}</th>
                        <th className="px-4 py-2 text-left">{locale === "bn" ? "মাধ্যম" : "Method"}</th>
                        <th className="px-4 py-2 text-left">{locale === "bn" ? "রেফারেন্স" : "Reference"}</th>
                        <th className="px-4 py-2 text-right">{t("common.amount")}</th>
                        <th className="px-4 py-2 text-center">{t("common.status")}</th>
                        {canVerify ? <th className="px-4 py-2 text-right">{t("common.actions")}</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => {
                        const student = lookups.students[payment.studentId];
                        return (
                          <tr key={payment.id} className="border-b border-slate-100 last:border-0">
                            <td className="px-4 py-2.5 tabular-nums text-slate-600">{formatDate(payment.createdAt, locale)}</td>
                            <td className="bn px-4 py-2.5 font-medium text-slate-800">{student ? student.fullNameBn || student.fullName : payment.studentId}</td>
                            <td className="px-4 py-2.5"><Badge tone="blue">{payment.method}</Badge></td>
                            <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{payment.transactionReference || "—"}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(payment.amountPaisa, locale)}</td>
                            <td className="px-4 py-2.5 text-center"><StatusBadge status={payment.verificationStatus} label={t(`status.${payment.verificationStatus}`)} /></td>
                            {canVerify ? (
                              <td className="px-4 py-2.5">
                                <div className="flex items-center justify-end gap-1.5">
                                  {payment.verificationStatus !== "verified" ? (
                                    <Button size="sm" variant="success" onClick={() => void setVerification(payment, "verified")}>{t("fees.verify")}</Button>
                                  ) : null}
                                  {payment.verificationStatus === "unverified" ? (
                                    <Button size="sm" variant="outline" onClick={() => void setVerification(payment, "rejected")}>{t("status.rejected")}</Button>
                                  ) : null}
                                </div>
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
        open={Boolean(payingFor)}
        onClose={() => setPayingFor(null)}
        title={t("fees.recordPayment")}
        description={payingFor ? `${locale === "bn" ? "বকেয়া" : "Due"}: ${formatMoney(payingFor.dueAmountPaisa, locale)}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPayingFor(null)} disabled={busy}>{t("common.cancel")}</Button>
            <Button onClick={submitPayment} loading={busy}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={`${t("common.amount")} (৳)`} htmlFor="pay-amount" required>
            <Input id="pay-amount" type="number" min={1} step="0.01" value={amountTaka} onChange={(event) => setAmountTaka(event.target.value)} />
          </Field>
          <Field label={locale === "bn" ? "মাধ্যম" : "Method"} htmlFor="pay-method" required>
            <Select id="pay-method" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
              {METHODS.map((item) => (
                <option key={item} value={item}>{item.toUpperCase()}</option>
              ))}
            </Select>
          </Field>
          <Field label={locale === "bn" ? "ট্রান্সেকশন রেফারেন্স" : "Transaction reference"} htmlFor="pay-ref" hint={method === "cash" ? undefined : (locale === "bn" ? "যাচাই না হওয়া পর্যন্ত রেফারেন্স অযাচাইকৃত থাকে।" : "References stay unverified until staff confirm them.")}>
            <Input id="pay-ref" value={reference} onChange={(event) => setReference(event.target.value)} />
          </Field>
          <Field label={t("common.notes")} htmlFor="pay-note">
            <Textarea id="pay-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          {canVerify ? (
            <Checkbox label={locale === "bn" ? "এখনই যাচাইকৃত হিসেবে চিহ্নিত করুন" : "Mark as verified now"} checked={verifyNow} onChange={(event) => setVerifyNow(event.target.checked)} />
          ) : (
            <p className="text-xs text-slate-500">{t("error.permission")}</p>
          )}
        </div>
      </Dialog>

      {receiptFor ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 print:static print:bg-white print:p-0">
          <div className="mx-auto max-w-2xl">
            <div className="no-print">
              <PrintToolbar title={t("fees.receipt")}>
                <Button variant="outline" size="sm" onClick={() => setReceiptFor(null)}>{t("common.close")}</Button>
              </PrintToolbar>
            </div>
            <div className="print-area">
              <FeeReceipt invoice={receiptFor.invoice} student={studentOf(receiptFor.invoice)} settings={settings} payments={receiptFor.payments} className={classNameOf(receiptFor.invoice)} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
