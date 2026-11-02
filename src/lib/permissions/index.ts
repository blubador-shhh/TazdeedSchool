import type { Role } from "@/types";

/**
 * Capability matrix.
 *
 * IMPORTANT: this file drives **navigation and UI affordances only**. The real
 * authorization boundary is `firestore.rules`, which re-checks the signed-in
 * user's Firestore profile (role, status, schoolId, class assignments,
 * parent-child links) on every read and write. Hiding a button is never the
 * security control.
 */

export const CAPABILITIES = [
  "dashboard.view",
  "students.view",
  "students.manage",
  "students.viewOwn",
  "students.export",
  "teachers.view",
  "teachers.manage",
  "staff.view",
  "staff.manage",
  "academics.view",
  "academics.manage",
  "attendance.view",
  "attendance.mark",
  "attendance.viewOwn",
  "exams.view",
  "exams.manage",
  "marks.enter",
  "results.view",
  "results.publish",
  "results.viewOwn",
  "fees.view",
  "fees.manage",
  "fees.verify",
  "fees.viewOwn",
  "expenses.view",
  "expenses.manage",
  "payroll.view",
  "payroll.manage",
  "notices.view",
  "notices.manage",
  "events.view",
  "events.manage",
  "homework.view",
  "homework.manage",
  "homework.submit",
  "homework.review",
  "library.view",
  "library.manage",
  "transport.view",
  "transport.manage",
  "reports.view",
  "users.view",
  "users.provision",
  "settings.manage",
  "site.manage",
  "admissions.review",
  "backup.export",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const ADMIN: Capability[] = [...CAPABILITIES];

const TEACHER: Capability[] = [
  "dashboard.view",
  "students.view",
  "students.export",
  "teachers.view",
  "academics.view",
  "attendance.view",
  "attendance.mark",
  "exams.view",
  "marks.enter",
  "results.view",
  "notices.view",
  "events.view",
  "homework.view",
  "homework.manage",
  "homework.review",
  "library.view",
  "transport.view",
];

const ACCOUNTANT: Capability[] = [
  "dashboard.view",
  "students.view",
  "students.export",
  "academics.view",
  "fees.view",
  "fees.manage",
  "fees.verify",
  "expenses.view",
  "expenses.manage",
  "payroll.view",
  "notices.view",
  "events.view",
  "reports.view",
  "backup.export",
];

const LIBRARIAN: Capability[] = [
  "dashboard.view",
  "students.view",
  "teachers.view",
  "staff.view",
  "library.view",
  "library.manage",
  "notices.view",
  "events.view",
  "reports.view",
];

const STUDENT: Capability[] = [
  "dashboard.view",
  "students.viewOwn",
  "attendance.viewOwn",
  "results.viewOwn",
  "notices.view",
  "events.view",
  "homework.view",
  "homework.submit",
  "library.view",
  "fees.viewOwn",
  "academics.view",
];

const PARENT: Capability[] = [
  "dashboard.view",
  "students.viewOwn",
  "attendance.viewOwn",
  "results.viewOwn",
  "notices.view",
  "events.view",
  "homework.view",
  "fees.viewOwn",
  "academics.view",
];

export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  admin: ADMIN,
  teacher: TEACHER,
  accountant: ACCOUNTANT,
  librarian: LIBRARIAN,
  student: STUDENT,
  parent: PARENT,
};

export function can(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

export function canAny(role: Role | null | undefined, capabilities: Capability[]): boolean {
  return capabilities.some((capability) => can(role, capability));
}

export function assertCan(role: Role | null | undefined, capability: Capability) {
  if (!can(role, capability)) {
    throw new Error(`Role "${role ?? "anonymous"}" is not allowed to perform "${capability}".`);
  }
}

/** Roles an administrator may provision from the UI. Admin creation is manual
 *  (see README §"First administrator") — role escalation is blocked here *and*
 *  in firestore.rules. */
export const PROVISIONABLE_ROLES: Role[] = ["teacher", "accountant", "librarian", "student", "parent"];

export function isProvisionableRole(role: string): role is Role {
  return (PROVISIONABLE_ROLES as string[]).includes(role);
}

export interface NavItem {
  href: string;
  labelKey: string;
  icon: string;
  capability: Capability;
  group: "people" | "academics" | "finance" | "communication" | "operations" | "system";
}

export const DASHBOARD_NAV: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.overview", icon: "layout-dashboard", capability: "dashboard.view", group: "system" },
  { href: "/dashboard/students", labelKey: "nav.students", icon: "graduation-cap", capability: "students.view", group: "people" },
  { href: "/dashboard/teachers", labelKey: "nav.teachers", icon: "presentation", capability: "teachers.view", group: "people" },
  { href: "/dashboard/staff", labelKey: "nav.staff", icon: "users", capability: "staff.view", group: "people" },
  { href: "/dashboard/users", labelKey: "nav.users", icon: "shield-check", capability: "users.view", group: "system" },
  { href: "/dashboard/academics", labelKey: "nav.academics", icon: "book-open", capability: "academics.view", group: "academics" },
  { href: "/dashboard/attendance", labelKey: "nav.attendance", icon: "calendar-check", capability: "attendance.view", group: "academics" },
  { href: "/dashboard/exams", labelKey: "nav.exams", icon: "file-text", capability: "exams.view", group: "academics" },
  { href: "/dashboard/results", labelKey: "nav.results", icon: "award", capability: "results.view", group: "academics" },
  { href: "/dashboard/homework", labelKey: "nav.homework", icon: "notebook-pen", capability: "homework.view", group: "academics" },
  { href: "/dashboard/fees", labelKey: "nav.fees", icon: "receipt", capability: "fees.view", group: "finance" },
  { href: "/dashboard/expenses", labelKey: "nav.expenses", icon: "wallet", capability: "expenses.view", group: "finance" },
  { href: "/dashboard/notices", labelKey: "nav.notices", icon: "megaphone", capability: "notices.view", group: "communication" },
  { href: "/dashboard/events", labelKey: "nav.events", icon: "calendar-days", capability: "events.view", group: "communication" },
  { href: "/dashboard/library", labelKey: "nav.library", icon: "library", capability: "library.view", group: "operations" },
  { href: "/dashboard/transport", labelKey: "nav.transport", icon: "bus", capability: "transport.view", group: "operations" },
  { href: "/dashboard/reports", labelKey: "nav.reports", icon: "bar-chart", capability: "reports.view", group: "system" },
  { href: "/dashboard/settings", labelKey: "nav.settings", icon: "settings", capability: "settings.manage", group: "system" },
  { href: "/dashboard/profile", labelKey: "nav.profile", icon: "user", capability: "dashboard.view", group: "system" },
];

/** Roles that may see a student's own record set (scoped by Firestore rules). */
export const OWN_RECORD_ROLES: Role[] = ["student", "parent"];
