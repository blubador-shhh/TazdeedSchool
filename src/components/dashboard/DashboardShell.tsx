"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu, ShieldAlert, TriangleAlert, User as UserIcon, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { schoolName, useSchool } from "@/features/settings/SchoolProvider";
import { DASHBOARD_NAV, type NavItem } from "@/lib/permissions";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Avatar, Badge, Button, Spinner } from "@/components/ui/primitives";

const GROUP_ORDER: NavItem["group"][] = ["system", "people", "academics", "finance", "communication", "operations"];

export function DashboardShell({ children }: { children: ReactNode }) {
  const { t, locale, setLocale } = useI18n();
  const { status, profile, role, signOutUser, can } = useAuth();
  const { settings, mode } = useSchool();
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "signed-out" || status === "no-profile" || status === "disabled") {
      router.replace("/login/");
    }
  }, [status, router]);

  // A signed-in user's stored language preference wins over the browser default.
  useEffect(() => {
    if (profile?.preferredLanguage && profile.preferredLanguage !== locale) setLocale(profile.preferredLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const allowedItems = useMemo(() => DASHBOARD_NAV.filter((item) => can(item.capability)), [can]);
  const groups = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({ group, items: allowedItems.filter((item) => item.group === group) })).filter(
        (entry) => entry.items.length > 0,
      ),
    [allowedItems],
  );

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center gap-3 text-sm text-slate-500">
        <Spinner className="size-6" />
        {t("common.loading")}
      </div>
    );
  }

  if (status !== "signed-in" || !profile) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md rounded-card border border-slate-200 bg-white p-6 text-center shadow-card">
          <ShieldAlert className="mx-auto size-8 text-amber-500" />
          <h1 className="mt-3 text-base font-semibold text-slate-900">{t("auth.loginTitle")}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("auth.loginSubtitle")}</p>
          <Link href="/login/" className="mt-4 inline-block">
            <Button>{t("nav.login")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const current = allowedItems.find((item) => pathname.replace(/\/$/, "") === item.href.replace(/\/$/, ""));
  const name = schoolName(settings, locale);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="rounded-lg bg-white/95 p-2">
          <Logo size="sm" href="/" />
        </div>
      </div>
      <nav aria-label="Dashboard navigation" className="scroll-thin flex-1 overflow-y-auto px-3 py-4">
        {groups.map((entry) => (
          <div key={entry.group} className="mb-5">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t(`nav.group.${entry.group}`)}
            </p>
            <ul className="space-y-0.5">
              {entry.items.map((item) => {
                const active = pathname.replace(/\/$/, "") === item.href.replace(/\/$/, "");
                return (
                  <li key={item.href}>
                    <Link
                      href={`${item.href}/`}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-royal-600 text-white shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Icon name={item.icon} className="size-4 shrink-0" />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-[11px] text-slate-400">
        {mode === "local" ? (
          <p className="flex items-start gap-1.5 text-amber-300">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {t("common.demoMode")}
          </p>
        ) : (
          <p className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-emerald-400" /> {t("common.firebaseConnected")}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-soft">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 bg-navy-700 lg:block">{sidebar}</aside>

      {drawerOpen ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div className="animate-rise absolute inset-y-0 left-0 w-72 bg-navy-700 shadow-lift">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label={t("nav.closeMenu")}
              className="absolute right-2 top-3 grid size-9 place-items-center rounded-lg text-slate-300 hover:bg-white/10"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("nav.menu")}
              aria-expanded={drawerOpen}
              className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-slate-900">{current ? t(current.labelKey) : t("nav.dashboard")}</h1>
              <p className="truncate text-xs text-slate-500">{name}</p>
            </div>
            {mode === "local" ? <Badge tone="amber">{t("common.demoMode")}</Badge> : null}
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <Link href="/" className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 sm:block" aria-label="Public website">
              <ExternalLink className="size-4" />
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((value) => !value)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 hover:bg-slate-100"
              >
                <Avatar name={profile.displayName} src={profile.photoUrl} size="sm" />
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[9rem] truncate text-xs font-semibold text-slate-800">
                    {locale === "bn" ? profile.displayNameBn || profile.displayName : profile.displayName}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wide text-slate-500">{t(`role.${role}`)}</span>
                </span>
              </button>
              {userMenuOpen ? (
                <div role="menu" className="animate-rise absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lift">
                  <Link role="menuitem" href="/dashboard/profile/" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <UserIcon className="size-4" /> {t("nav.profile")}
                  </Link>
                  <Link role="menuitem" href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <ExternalLink className="size-4" /> {t("nav.home")}
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    onClick={async () => {
                      await signOutUser();
                      router.replace("/login/");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"
                  >
                    <LogOut className="size-4" /> {t("nav.logout")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {mode === "local" ? (
          <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 sm:px-6">
            {t("common.demoModeBody")}
          </div>
        ) : null}

        <main className="print-hide-overflow px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function DashboardPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="no-print mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-bold tracking-tight text-navy-700 sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
