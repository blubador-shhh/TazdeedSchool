"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { schoolName, useSchool } from "@/features/settings/SchoolProvider";
import { useI18n } from "@/lib/i18n";

/**
 * Official school logo.
 *
 * Resolution order:
 *   1. `logoUrl` from school settings (validated https/local asset)
 *   2. the bundled official asset  /images/tazdeed-school-logo.png
 *   3. the bundled vector fallback  /images/tazdeed-school-logo.svg
 *   4. an inline monogram tile (never a broken image)
 *
 * The aspect ratio is always preserved (`object-contain`, fixed box).
 */

const BUNDLED_PNG = "/images/tazdeed-school-logo.png";
const BUNDLED_SVG = "/images/tazdeed-school-logo.svg";

export function Logo({
  className,
  size = "md",
  withWordmark = true,
  href = "/",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  href?: string | null;
}) {
  const { settings } = useSchool();
  const { locale, t } = useI18n();

  // 0 = configured/bundled PNG, 1 = bundled SVG, 2 = monogram tile.
  // The attempt counter is keyed to the configured URL so a settings change
  // resets the fallback chain without an extra render pass.
  const primary = settings?.logoUrl || BUNDLED_PNG;
  const [attempt, setAttempt] = useState(0);
  const [attemptFor, setAttemptFor] = useState(primary);
  const step = attemptFor === primary ? attempt : 0;
  const source = step === 0 ? primary : BUNDLED_SVG;
  const failed = step >= 2;

  const boxes = { sm: "size-9", md: "size-11", lg: "size-16" } as const;
  const textSize = { sm: "text-sm", md: "text-base", lg: "text-xl" } as const;

  function handleError() {
    setAttemptFor(primary);
    setAttempt(step + 1);
  }

  const mark = failed ? (
    <span
      className={cn("grid shrink-0 place-items-center rounded-xl bg-navy-600 font-bold text-white", boxes[size])}
      aria-hidden="true"
    >
      <span className={size === "lg" ? "text-lg" : "text-xs"}>TZ</span>
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={`${schoolName(settings, locale)} logo`}
      width={size === "lg" ? 64 : size === "md" ? 44 : 36}
      height={size === "lg" ? 64 : size === "md" ? 44 : 36}
      onError={handleError}
      className={cn("shrink-0 rounded-lg object-contain", boxes[size], className)}
    />
  );

  const content = (
    <span className="flex min-w-0 items-center gap-2.5">
      {mark}
      {withWordmark ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className={cn("truncate font-bold tracking-tight text-navy-700", textSize[size])}>
            {schoolName(settings, locale)}
          </span>
          {size !== "sm" ? (
            <span className="truncate text-[11px] font-medium text-slate-500">
              {locale === "bn" ? settings?.taglineBn || t("site.tagline") : settings?.taglineEn || t("site.tagline")}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  return href ? (
    <Link href={href} className="rounded-lg" aria-label={schoolName(settings, locale)}>
      {content}
    </Link>
  ) : (
    content
  );
}
