import type { Locale } from "@/types";

/** School-local date key, `YYYY-MM-DD`. Used for attendance uniqueness. */
export function toDateKey(input: Date | string = new Date()): string {
  const date = typeof input === "string" ? parseDateKey(input) || new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function monthKey(input: Date | string = new Date()): string {
  return toDateKey(input).slice(0, 7);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key) ?? new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const a = parseDateKey(fromKey);
  const b = parseDateKey(toKey);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Locale-aware date formatting (Bengali digits for `bn`). */
export function formatDate(
  value: string | Date | null | undefined,
  locale: Locale = "en",
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" },
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseDateKey(value) ?? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", options).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatDateTime(value: string | Date | null | undefined, locale: Locale = "en"): string {
  return formatDate(value, locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(value: number, locale: Locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US").format(value);
  } catch {
    return String(value);
  }
}

/** True only for events that have not happened yet (never labels past as upcoming). */
export function isUpcoming(dateKeyOrIso: string, now = new Date()): boolean {
  const date = parseDateKey(dateKeyOrIso) ?? new Date(dateKeyOrIso);
  if (Number.isNaN(date.getTime())) return false;
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  return endOfDay.getTime() >= now.getTime();
}

export function isPast(dateKeyOrIso: string, now = new Date()): boolean {
  const date = parseDateKey(dateKeyOrIso) ?? new Date(dateKeyOrIso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function isWithinRange(
  dateKeyOrIso: string,
  fromKey?: string | null,
  toKey?: string | null,
): boolean {
  const key = toDateKey(dateKeyOrIso);
  if (!key) return false;
  if (fromKey && key < fromKey) return false;
  if (toKey && key > toKey) return false;
  return true;
}

/** Last `n` day keys ending today, oldest first — used for attendance charts. */
export function lastNDays(n: number, end = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    out.push(toDateKey(d));
  }
  return out;
}

export function monthLabel(key: string, locale: Locale = "en"): string {
  const date = new Date(`${key}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return key;
  try {
    return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return key;
  }
}
