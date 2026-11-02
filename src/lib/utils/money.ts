import type { Invoice, InvoiceStatus, Payment } from "@/types";

/**
 * Money helpers.
 *
 * All stored amounts are **integer paisa** (1 taka = 100 paisa). Floats are
 * never persisted, so invoice balances cannot drift.
 */

export const PAISA_PER_TAKA = 100;

export function toPaisa(taka: number | string | null | undefined): number {
  const value = typeof taka === "string" ? Number(taka.replace(/[^0-9.-]/g, "")) : taka;
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 0;
  return Math.round(Number(value) * PAISA_PER_TAKA);
}

export function toTaka(paisa: number): number {
  return (Number(paisa) || 0) / PAISA_PER_TAKA;
}

export function sumPaisa(values: number[]): number {
  return values.reduce((total, value) => total + (Math.round(Number(value)) || 0), 0);
}

export function formatMoney(paisa: number, locale: "bn" | "en" = "en", currency = "৳"): string {
  const amount = toTaka(paisa);
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  } catch {
    formatted = Math.abs(amount).toFixed(2);
  }
  return `${amount < 0 ? "-" : ""}${currency}${formatted}`;
}

export function invoiceNetAmount(invoice: Pick<Invoice, "amountPaisa" | "discountPaisa">): number {
  const amount = Math.max(0, Math.round(invoice.amountPaisa || 0));
  const discount = Math.min(amount, Math.max(0, Math.round(invoice.discountPaisa || 0)));
  return amount - discount;
}

/** Verified payments only — an unverified bKash reference never settles a bill. */
export function verifiedPaidPaisa(payments: Pick<Payment, "amountPaisa" | "verificationStatus">[]): number {
  return sumPaisa(
    payments
      .filter((payment) => payment.verificationStatus === "verified")
      .map((payment) => payment.amountPaisa),
  );
}

export function invoiceStatus(netAmount: number, paid: number, dueDate?: string): InvoiceStatus {
  if (netAmount <= 0) return "waived";
  if (paid >= netAmount) return "paid";
  if (paid > 0) {
    return dueDate && toDateKeyLocal(dueDate) < toDateKeyLocal(new Date()) ? "overdue" : "partial";
  }
  return dueDate && toDateKeyLocal(dueDate) < toDateKeyLocal(new Date()) ? "overdue" : "unpaid";
}

function toDateKeyLocal(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

/** Recompute an invoice from its payment ledger — the single source of truth. */
export function reconcileInvoice(
  invoice: Pick<Invoice, "id" | "schoolId" | "amountPaisa" | "discountPaisa" | "dueDate"> &
    Partial<Invoice>,
  payments: Pick<Payment, "amountPaisa" | "verificationStatus">[],
): Pick<Invoice, "paidAmountPaisa" | "dueAmountPaisa" | "status"> {
  const net = invoiceNetAmount(invoice);
  const paid = Math.min(net, verifiedPaidPaisa(payments));
  return {
    paidAmountPaisa: paid,
    dueAmountPaisa: Math.max(0, net - paid),
    status: invoice.status === "waived" || invoice.status === "draft" ? invoice.status : invoiceStatus(net, paid, invoice.dueDate),
  };
}

/** Validates a payment before it is written (positive, not exceeding the due). */
export function validatePaymentAmount(
  amountPaisa: number,
  invoice: { paidAmountPaisa: number; amountPaisa: number; discountPaisa: number },
): { ok: boolean; message?: string } {
  if (!Number.isInteger(amountPaisa)) return { ok: false, message: "Amount must be a whole paisa value." };
  if (amountPaisa <= 0) return { ok: false, message: "Amount must be greater than zero." };
  const net = invoiceNetAmount(invoice);
  const remaining = net - Math.max(0, invoice.paidAmountPaisa || 0);
  if (amountPaisa > remaining) {
    return { ok: false, message: `Amount exceeds the outstanding balance of ${formatMoney(remaining)}.` };
  }
  return { ok: true };
}

/** Receipt number, e.g. TZD/2026/000123 — generated through a counter document. */
export function formatReceiptNo(sequence: number, year: number, prefix = "TZD"): string {
  return `${prefix}/${year}/${`${Math.max(0, Math.trunc(sequence))}`.padStart(6, "0")}`;
}
