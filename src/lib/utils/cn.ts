import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware class joiner. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Deterministic-ish short id for local/demo documents. */
export function makeId(prefix = "id") {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function truncate(value: string, max = 80) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function groupBy<T, K extends string>(items: T[], key: (item: T) => K) {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const k = key(item);
    (out[k] ||= []).push(item);
  }
  return out;
}

export function sumBy<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((total, item) => total + (Number(pick(item)) || 0), 0);
}

/** Human readable Firestore/permission errors. */
export function describeError(error: unknown): string {
  if (typeof error === "string") return error;
  const anyErr = error as { code?: string; message?: string };
  const message = anyErr?.message ?? "Unexpected error";
  switch (anyErr?.code) {
    case "permission-denied":
      return "You do not have permission to perform this action (permission-denied).";
    case "unauthenticated":
      return "Your session expired. Please sign in again.";
    case "not-found":
      return "The record no longer exists.";
    case "already-exists":
      return "A record with the same unique key already exists.";
    case "unavailable":
    case "failed-precondition":
      return "Network or Firestore is unavailable. Check your connection and retry.";
    case "resource-exhausted":
      return "Daily free-tier quota reached. Try again after the quota resets.";
    case "auth/invalid-email":
      return "That email address is not valid.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/email-already-in-use":
      return "That email already has an account.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/operation-not-allowed":
      return "Email/password sign-in is not enabled in Firebase Authentication.";
    default:
      return message;
  }
}
