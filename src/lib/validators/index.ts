/**
 * Input validators shared by the public site, forms and settings screens.
 * Firebase Storage is not used, so images are either bundled local assets
 * (`/images/...`) or externally hosted HTTPS URLs — nothing else is accepted.
 */

const DANGEROUS_PROTOCOLS = ["javascript:", "data:", "vbscript:", "file:", "blob:"];

export function isLocalAssetPath(value: string): boolean {
  return /^\/(images|_next)\/[\w\-./%@+]+$/.test(value);
}

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (DANGEROUS_PROTOCOLS.some((p) => value.toLowerCase().startsWith(p))) return false;
    return Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
}

/** Images: bundled local asset or HTTPS URL only. */
export function isSafeImageUrl(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (isLocalAssetPath(trimmed)) return true;
  if (!trimmed.toLowerCase().startsWith("https://")) return false;
  return isSafeHttpUrl(trimmed) && /\.(png|jpe?g|webp|gif|svg|avif)(\?|#|$)/i.test(trimmed);
}

/** Links used in settings: https, mailto and tel only. */
export function isSafeLinkUrl(value: string): boolean {
  const trimmed = (value || "").trim();
  if (!trimmed) return false;
  if (isLocalAssetPath(trimmed)) return true;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return true;
  if (/^tel:\+?[0-9\s\-()]{6,20}$/.test(trimmed)) return true;
  if (!trimmed.toLowerCase().startsWith("https://")) return false;
  return isSafeHttpUrl(trimmed);
}

export function isSafeAttachmentUrl(value: string): boolean {
  const trimmed = (value || "").trim();
  if (!trimmed) return false;
  if (!trimmed.toLowerCase().startsWith("https://")) return false;
  return isSafeHttpUrl(trimmed);
}

export function isBangladeshiPhone(value: string): boolean {
  return /^(\+?88)?01[3-9]\d{8}$/.test((value || "").replace(/[\s-]/g, ""));
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((value || "").trim());
}

/** Firebase document ids must not contain these characters. */
export function toDocumentId(value: string): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function sanitizePlainText(value: string, maxLength = 4000): string {
  return (value || "").replace(/[<>]/g, "").slice(0, maxLength).trim();
}

export function isPositiveInt(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
