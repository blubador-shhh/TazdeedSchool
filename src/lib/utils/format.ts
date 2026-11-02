import { formatDate as formatDateBase, formatDateTime as formatDateTimeBase } from "@/lib/utils/date";
import { isSafeImageUrl } from "@/lib/validators";
import type { Locale } from "@/types";

/** Re-exported so UI code imports formatting from one place. */
export function formatDate(value: string | Date | null | undefined, locale: Locale = "en"): string {
  return formatDateBase(value, locale);
}

export function formatDateTime(value: string | Date | null | undefined, locale: Locale = "en"): string {
  return formatDateTimeBase(value, locale);
}

const LOCAL_PLACEHOLDERS = [
  "/images/gallery/girls-in-class.jpg",
  "/images/gallery/creative-drawing.jpg",
  "/images/gallery/outdoor-assembly.jpg",
  "/images/gallery/writing-practice.jpg",
  "/images/gallery/library-reading.jpg",
  "/images/gallery/junior-class.jpg",
];

/**
 * Returns the URL only when it is a bundled local asset or a validated https
 * image URL. Anything else (javascript:, data:, unvalidated hosts) yields the
 * empty string so callers can render an attractive placeholder instead.
 */
export function isSafeImageUrlFallback(url?: string | null, fallback = ""): string {
  if (!url) return fallback;
  const trimmed = url.trim();
  return isSafeImageUrl(trimmed) ? trimmed : fallback;
}

export function placeholderImage(seed = 0): string {
  return LOCAL_PLACEHOLDERS[Math.abs(seed) % LOCAL_PLACEHOLDERS.length];
}
