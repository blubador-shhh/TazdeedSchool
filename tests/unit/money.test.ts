import { describe, expect, it } from "vitest";
import {
  PAISA_PER_TAKA,
  formatMoney,
  formatReceiptNo,
  invoiceNetAmount,
  invoiceStatus,
  reconcileInvoice,
  sumPaisa,
  toPaisa,
  toTaka,
  validatePaymentAmount,
  verifiedPaidPaisa,
} from "@/lib/utils/money";
import type { Invoice, Payment } from "@/types";

const invoice = {
  id: "inv-1",
  schoolId: "tazdeed-school",
  amountPaisa: 85000,
  discountPaisa: 5000,
  paidAmountPaisa: 0,
  dueAmountPaisa: 80000,
  dueDate: "2099-01-10",
};

const payment = (amountPaisa: number, verificationStatus: Payment["verificationStatus"]): Payment =>
  ({ id: `p-${amountPaisa}-${verificationStatus}`, amountPaisa, verificationStatus } as Payment);

describe("paisa arithmetic", () => {
  it("converts taka to integer paisa without float drift", () => {
    expect(PAISA_PER_TAKA).toBe(100);
    expect(toPaisa(850)).toBe(85000);
    expect(toPaisa(0.07)).toBe(7);
    expect(toPaisa(19.99)).toBe(1999); // 19.99 * 100 === 1998.9999… in float
    expect(toPaisa("1,250.50")).toBe(125050);
    expect(toPaisa(null)).toBe(0);
    expect(toPaisa("abc")).toBe(0);
    expect(toTaka(1999)).toBe(19.99);
  });

  it("sums only integer paisa", () => {
    expect(sumPaisa([100, 200.6, 300])).toBe(601);
    expect(sumPaisa([])).toBe(0);
  });

  it("formats amounts per locale", () => {
    expect(formatMoney(85000, "en")).toBe("৳850.00");
    expect(formatMoney(-1234, "en")).toBe("-৳12.34");
    expect(formatMoney(100000, "bn")).toMatch(/৳/);
  });
});

describe("invoice balances", () => {
  it("subtracts discounts but never below zero", () => {
    expect(invoiceNetAmount(invoice)).toBe(80000);
    expect(invoiceNetAmount({ amountPaisa: 1000, discountPaisa: 5000 })).toBe(0);
    expect(invoiceNetAmount({ amountPaisa: 1000, discountPaisa: -500 })).toBe(1000);
  });

  it("counts only verified payments", () => {
    expect(verifiedPaidPaisa([payment(30000, "verified"), payment(20000, "unverified"), payment(5000, "rejected")])).toBe(30000);
  });

  it("derives the invoice status from the ledger", () => {
    expect(invoiceStatus(80000, 0, "2099-01-10")).toBe("unpaid");
    expect(invoiceStatus(80000, 30000, "2099-01-10")).toBe("partial");
    expect(invoiceStatus(80000, 80000, "2099-01-10")).toBe("paid");
    expect(invoiceStatus(80000, 0, "2000-01-10")).toBe("overdue");
    expect(invoiceStatus(0, 0, "2099-01-10")).toBe("waived");
  });

  it("reconciles an invoice from its payments", () => {
    const reconciled = reconcileInvoice(invoice as Invoice, [payment(30000, "verified"), payment(99999, "unverified")]);
    expect(reconciled.paidAmountPaisa).toBe(30000);
    expect(reconciled.dueAmountPaisa).toBe(50000);
    expect(reconciled.status).toBe("partial");

    const settled = reconcileInvoice(invoice as Invoice, [payment(80000, "verified")]);
    expect(settled.status).toBe("paid");
    expect(settled.dueAmountPaisa).toBe(0);

    const overpaid = reconcileInvoice(invoice as Invoice, [payment(500000, "verified")]);
    expect(overpaid.paidAmountPaisa).toBe(80000); // never exceeds the net amount
  });

  it("keeps a waived invoice waived", () => {
    const reconciled = reconcileInvoice({ ...invoice, status: "waived" } as Invoice, [payment(1000, "verified")]);
    expect(reconciled.status).toBe("waived");
  });
});

describe("payment validation", () => {
  it("rejects zero, negative, fractional and over-due amounts", () => {
    const base = { paidAmountPaisa: 0, amountPaisa: 85000, discountPaisa: 5000 };
    expect(validatePaymentAmount(0, base).ok).toBe(false);
    expect(validatePaymentAmount(-500, base).ok).toBe(false);
    expect(validatePaymentAmount(1000.5, base).ok).toBe(false);
    expect(validatePaymentAmount(90000, base).ok).toBe(false);
    expect(validatePaymentAmount(80000, base).ok).toBe(true);
    expect(validatePaymentAmount(80000, { ...base, paidAmountPaisa: 80000 }).ok).toBe(false);
  });
});

describe("receipt numbering", () => {
  it("formats a zero-padded receipt number", () => {
    expect(formatReceiptNo(1, 2026)).toBe("TZD/2026/000001");
    expect(formatReceiptNo(123456, 2026)).toBe("TZD/2026/123456");
    expect(formatReceiptNo(7, 2026, "RCPT")).toBe("RCPT/2026/000007");
  });
});
