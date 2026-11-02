"use client";

import {
  BarChart3,
  BookOpen,
  Bus,
  CalendarCheck,
  CalendarDays,
  Cctv,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  Library as LibraryIcon,
  Megaphone,
  Monitor,
  NotebookPen,
  Presentation,
  Receipt,
  Rocket,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  TreePine,
  User,
  Users,
  Wallet,
  Award,
  FileText,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "graduation-cap": GraduationCap,
  presentation: Presentation,
  users: Users,
  user: User,
  "shield-check": ShieldCheck,
  "book-open": BookOpen,
  "calendar-check": CalendarCheck,
  "calendar-days": CalendarDays,
  "file-text": FileText,
  award: Award,
  "notebook-pen": NotebookPen,
  receipt: Receipt,
  wallet: Wallet,
  megaphone: Megaphone,
  library: LibraryIcon,
  bus: Bus,
  "bar-chart": BarChart3,
  settings: SettingsIcon,
  monitor: Monitor,
  sparkles: Sparkles,
  rocket: Rocket,
  "flask-conical": FlaskConical,
  trees: TreePine,
  cctv: Cctv,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Component = ICONS[name] ?? Sparkles;
  return <Component className={className} aria-hidden="true" />;
}

export const ICON_NAMES = Object.keys(ICONS);
