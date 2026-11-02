"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogIn, LayoutDashboard, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { Logo } from "@/components/layout/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

interface NavEntry {
  key: string;
  href: string;
  children?: { key: string; href: string }[];
}

const NAV: NavEntry[] = [
  { key: "nav.home", href: "/" },
  { key: "nav.about", href: "/about/" },
  { key: "nav.academics", href: "/academics/" },
  { key: "nav.admission", href: "/admission/" },
  { key: "nav.facilities", href: "/facilities/" },
  { key: "nav.notices", href: "/notices/", children: [{ key: "nav.events", href: "/events/" }] },
  { key: "nav.gallery", href: "/gallery/" },
  { key: "nav.contact", href: "/contact/" },
];

function isActive(pathname: string, href: string, children?: { href: string }[]) {
  const normalised = pathname.replace(/\/$/, "") || "/";
  const target = href.replace(/\/$/, "") || "/";
  if (normalised === target) return true;
  return Boolean(children?.some((child) => normalised === child.href.replace(/\/$/, "")));
}

export function SiteHeader() {
  const { t } = useI18n();
  const pathname = usePathname() ?? "/";
  const { status } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust state during render when the route changes (no cascading effect).
  const [previousPath, setPreviousPath] = useState(pathname);
  if (previousPath !== pathname) {
    setPreviousPath(pathname);
    setMobileOpen(false);
    setOpenMenu(null);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setOpenMenu(null);
      }
    }
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  const signedIn = status === "signed-in";

  return (
    <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Logo />

        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {NAV.map((entry) => {
            const active = isActive(pathname, entry.href, entry.children);
            if (!entry.children) {
              return (
                <Link
                  key={entry.key}
                  href={entry.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-navy-50 text-navy-700" : "text-slate-600 hover:bg-slate-100 hover:text-navy-700",
                  )}
                >
                  {t(entry.key)}
                </Link>
              );
            }
            return (
              <div key={entry.key} className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setOpenMenu((current) => (current === entry.key ? null : entry.key))}
                  aria-expanded={openMenu === entry.key}
                  aria-haspopup="true"
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-navy-50 text-navy-700" : "text-slate-600 hover:bg-slate-100 hover:text-navy-700",
                  )}
                >
                  {t(entry.key)}
                  <ChevronDown className={cn("size-3.5 transition-transform", openMenu === entry.key && "rotate-180")} />
                </button>
                {openMenu === entry.key ? (
                  <div className="animate-rise absolute left-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lift">
                    <Link href={entry.href} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      {t(entry.key)}
                    </Link>
                    {entry.children.map((child) => (
                      <Link key={child.key} href={child.href} className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        {t(child.key)}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          {signedIn ? (
            <Link
              href="/dashboard/"
              className="hidden items-center gap-1.5 rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-700 sm:inline-flex"
            >
              <LayoutDashboard className="size-4" /> {t("nav.dashboard")}
            </Link>
          ) : (
            <Link
              href="/login/"
              className="hidden items-center gap-1.5 rounded-lg bg-royal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-royal-700 sm:inline-flex"
            >
              <LogIn className="size-4" /> {t("nav.login")}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? t("nav.closeMenu") : t("nav.menu")}
            className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div id="mobile-navigation" className="animate-rise border-t border-slate-200 bg-white lg:hidden">
          <nav aria-label="Mobile navigation" className="mx-auto grid max-w-7xl gap-1 px-4 py-3 sm:px-6">
            {NAV.map((entry) => (
              <Link
                key={entry.key}
                href={entry.href}
                aria-current={isActive(pathname, entry.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive(pathname, entry.href) ? "bg-navy-50 text-navy-700" : "text-slate-700 hover:bg-slate-50",
                )}
              >
                {t(entry.key)}
              </Link>
            ))}
            {NAV.flatMap((entry) => entry.children ?? []).map((child) => (
              <Link key={child.key} href={child.href} className="rounded-lg px-3 py-2.5 pl-6 text-sm font-medium text-slate-600 hover:bg-slate-50">
                {t(child.key)}
              </Link>
            ))}
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <LanguageSwitcher />
              <Link
                href={signedIn ? "/dashboard/" : "/login/"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-royal-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {signedIn ? <LayoutDashboard className="size-4" /> : <LogIn className="size-4" />}
                {signedIn ? t("nav.dashboard") : t("nav.login")}
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
