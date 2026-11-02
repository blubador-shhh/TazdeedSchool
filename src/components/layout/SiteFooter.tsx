"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, Globe, Mail, MapPin, Phone, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { schoolName, useSchool } from "@/features/settings/SchoolProvider";
import { Logo } from "@/components/layout/Logo";
import { Dialog } from "@/components/ui/overlays";
import { isSafeLinkUrl } from "@/lib/validators";

const QUICK_LINKS = [
  { key: "nav.home", href: "/" },
  { key: "nav.about", href: "/about/" },
  { key: "nav.admission", href: "/admission/" },
  { key: "nav.notices", href: "/notices/" },
  { key: "nav.gallery", href: "/gallery/" },
  { key: "nav.contact", href: "/contact/" },
];

const ACADEMIC_LINKS = [
  { key: "nav.academics", href: "/academics/" },
  { key: "nav.facilities", href: "/facilities/" },
  { key: "nav.events", href: "/events/" },
  { key: "nav.login", href: "/login/" },
];

export function SiteFooter() {
  const { t, locale, tl } = useI18n();
  const { settings } = useSchool();
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);
  const name = schoolName(settings, locale);

  const socials = [
    { href: settings?.facebookUrl, label: "Facebook", Icon: Globe },
    { href: settings?.youtubeUrl, label: "YouTube", Icon: Play },
    { href: settings?.linkedinUrl, label: "LinkedIn", Icon: Briefcase },
  ].filter((item): item is { href: string; label: string; Icon: typeof Globe } =>
    Boolean(item.href && isSafeLinkUrl(item.href)),
  );

  const address = locale === "bn" ? settings?.addressBn || settings?.addressEn : settings?.addressEn || settings?.addressBn;

  return (
    <footer className="no-print mt-auto bg-navy-700 text-slate-200">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="rounded-xl bg-white/95 p-2 inline-block">
            <Logo size="sm" href="/" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            {settings?.taglineBn || settings?.taglineEn
              ? tl({ bn: settings.taglineBn, en: settings.taglineEn })
              : t("site.tagline")}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">{t("home.noticesConfig")}</p>
        </div>

        <nav aria-label={t("home.quickLinks")}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{t("home.quickLinks")}</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {QUICK_LINKS.map((link) => (
              <li key={link.key}>
                <Link href={link.href} className="text-slate-300 transition-colors hover:text-white">
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("home.academicsLinks")}>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{t("home.academicsLinks")}</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {ACADEMIC_LINKS.map((link) => (
              <li key={link.key}>
                <Link href={link.href} className="text-slate-300 transition-colors hover:text-white">
                  {t(link.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{t("home.contactUs")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <span>{address || t("contact.notConfigured")}</span>
            </li>
            {settings?.phone ? (
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-slate-400" />
                <a href={`tel:${settings.phone}`} className="hover:text-white">
                  {settings.phone}
                </a>
              </li>
            ) : null}
            {settings?.email ? (
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-slate-400" />
                <a href={`mailto:${settings.email}`} className="hover:text-white">
                  {settings.email}
                </a>
              </li>
            ) : null}
            {settings?.openingHours ? (
              <li className="text-xs text-slate-400">{settings.openingHours}</li>
            ) : null}
          </ul>
          {socials.length > 0 ? (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-400">{t("home.followUs")}</span>
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-8 place-items-center rounded-lg bg-white/10 text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-slate-400 sm:flex-row sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {name}. {t("home.rights")}
          </p>
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setLegal("privacy")} className="rounded transition-colors hover:text-white">
              {t("home.privacy")}
            </button>
            <button type="button" onClick={() => setLegal("terms")} className="rounded transition-colors hover:text-white">
              {t("home.terms")}
            </button>
          </div>
        </div>
      </div>

      <Dialog
        open={legal !== null}
        onClose={() => setLegal(null)}
        title={legal === "privacy" ? t("home.privacy") : t("home.terms")}
        size="md"
      >
        <div className="space-y-3 text-sm leading-relaxed text-slate-600">
          <p>
            {legal === "privacy"
              ? "Student, guardian and staff records are stored in Cloud Firestore and are readable only by signed-in accounts whose role and school membership allow it. Public visitors can read published notices, events, gallery items and school contact details only."
              : "This website provides public school information and an authenticated school management area. Accounts are issued by the school office; there is no public registration."}
          </p>
          <p>
            Images are served as bundled static assets or validated https URLs — no file uploads are stored, because Firebase Storage is not used by this system.
          </p>
          <p className="text-xs text-slate-500">
            {locale === "bn"
              ? "এই নীতিমালার চূড়ান্ত পাঠ স্কুল কর্তৃপক্ষ সেটিংস থেকে হালনাগাদ করবেন।"
              : "The school administration maintains the authoritative version of this text."}
          </p>
        </div>
      </Dialog>
    </footer>
  );
}
