"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth, type NewAccountInput } from "@/features/auth/AuthProvider";
import { useCollection } from "@/hooks/useCollection";
import { createDoc, updateDocById } from "@/lib/data/store";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { PROVISIONABLE_ROLES, can, type Capability } from "@/lib/permissions";
import { describeError, initials } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { isValidEmail } from "@/lib/validators";
import { AccessDenied } from "@/features/crud/ModulePage";
import { DashboardPageHeader } from "@/components/dashboard/DashboardShell";
import { Avatar, Badge, Button, Card, CardContent, CardHeader, Field, Input, Select, StatusBadge } from "@/components/ui/primitives";
import { Dialog, useToast } from "@/components/ui/overlays";
import { EmptyState, LoadingBlock, SearchInput } from "@/components/ui/feedback";
import type { Role, SchoolUser } from "@/types";

export default function UsersPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const { role, provisionAccount, createProfileForExistingUid, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolUser | null>(null);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState<NewAccountInput>({
    email: "",
    password: "",
    displayName: "",
    displayNameBn: "",
    phone: "",
    role: "teacher",
    studentId: "",
    teacherId: "",
    guardianStudentIds: [],
  });
  const [recovery, setRecovery] = useState({ uid: "", email: "", displayName: "", role: "teacher" as Role });
  const [guardianIds, setGuardianIds] = useState("");

  const users = useCollection<SchoolUser>("users", { orderBy: [["createdAt", "desc"]], limit: 200 });

  const visible = users.rows.filter((user) =>
    !search.trim()
      ? true
      : [user.displayName, user.displayNameBn, user.email, user.role].join(" ").toLowerCase().includes(search.trim().toLowerCase()),
  );

  async function submitCreate() {
    if (!isValidEmail(form.email)) {
      toast.error(t("validation.email"));
      return;
    }
    if (form.password.length < 6) {
      toast.error(t("validation.passwordMin"));
      return;
    }
    if (!PROVISIONABLE_ROLES.includes(form.role)) {
      toast.error(t("error.permission"));
      return;
    }
    setBusy(true);
    try {
      const result = await provisionAccount({
        ...form,
        guardianStudentIds: guardianIds.split(",").map((id) => id.trim()).filter(Boolean),
      });
      setCreateOpen(false);
      toast.success(
        locale === "bn" ? "অ্যাকাউন্ট তৈরি হয়েছে" : "Account created",
        result.profileCreated
          ? result.uid
          : locale === "bn"
            ? `Authentication তৈরি হয়েছে (${result.uid}) কিন্তু প্রোফাইল লেখা ব্যর্থ — “প্রোফাইল পুনরুদ্ধার” ব্যবহার করুন।`
            : `Auth account created (${result.uid}) but the profile write failed — use “Recover profile”.`,
      );
      users.reload();
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit() {
    if (!editing) return;
    setBusy(true);
    try {
      await updateDocById("users", editing.uid, {
        role: editing.role,
        status: editing.status,
        displayName: editing.displayName,
        displayNameBn: editing.displayNameBn,
        phone: editing.phone,
      });
      toast.success(t("common.save"));
      setEditing(null);
      users.reload();
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  async function submitRecovery() {
    if (!recovery.uid.trim() || !isValidEmail(recovery.email)) {
      toast.error(t("validation.email"));
      return;
    }
    setBusy(true);
    try {
      await createProfileForExistingUid({ ...recovery, uid: recovery.uid.trim() });
      toast.success(locale === "bn" ? "প্রোফাইল তৈরি হয়েছে" : "Profile created");
      setRecoverOpen(false);
      users.reload();
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!can(role, "users.view" as Capability)) return <AccessDenied capability="users.view" />;

  return (
    <>
      <DashboardPageHeader
        title={t("nav.users")}
        description={locale === "bn" ? "ভূমিকা, অবস্থা ও অ্যাকাউন্ট প্রোভিশনিং।" : "Roles, status and account provisioning."}
        actions={
          can(role, "users.provision" as Capability) ? (
            <>
              <Button size="sm" variant="outline" icon={<KeyRound className="size-4" />} onClick={() => setRecoverOpen(true)}>
                {locale === "bn" ? "প্রোফাইল পুনরুদ্ধার" : "Recover profile"}
              </Button>
              <Button size="sm" icon={<UserPlus className="size-4" />} onClick={() => setCreateOpen(true)}>
                {t("users.create")}
              </Button>
            </>
          ) : undefined
        }
      />

      <Card className="mb-4 border-slate-200 bg-soft">
        <CardContent className="text-xs leading-relaxed text-slate-600">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-navy-600" />
            <span>
              {locale === "bn"
                ? "প্রথম প্রশাসক ম্যানুয়ালি তৈরি করতে হয়: Firebase Authentication-এ অ্যাকাউন্ট খুলে সেই UID দিয়ে /users/{uid} ডকুমেন্টে role: admin, status: active, schoolId লিখুন। এই স্ক্রিন থেকে প্রশাসক তৈরি করা যায় না এবং Firestore নিয়ম রোল এসকেলেশন ব্লক করে।"
                : "The first administrator is provisioned manually: create the account in Firebase Authentication, then write /users/{uid} with role: admin, status: active and your schoolId. Administrators cannot be created from this screen, and Firestore rules block role escalation."}
            </span>
          </p>
          <p className="mt-2 font-mono text-[11px] text-slate-500">schoolId: {SCHOOL_ID}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={locale === "bn" ? "ব্যবহারকারী তালিকা" : "User accounts"}
          description={`${visible.length}`}
          action={<SearchInput value={search} onChange={setSearch} placeholder={t("common.searchPlaceholder")} className="w-56" />}
        />
        {users.loading ? (
          <LoadingBlock label={t("common.loading")} />
        ) : visible.length === 0 ? (
          <EmptyState title={t("empty.title")} body={t("users.createNote")} />
        ) : (
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100">
              {visible.map((user) => (
                <li key={user.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <Avatar name={user.displayName} src={user.photoUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {locale === "bn" ? user.displayNameBn || user.displayName : user.displayName}
                      {user.uid === profile?.uid ? <span className="ml-2 text-xs font-normal text-slate-400">({locale === "bn" ? "আপনি" : "you"})</span> : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={user.role === "admin" ? "navy" : "blue"}>{t(`role.${user.role}`)}</Badge>
                    <StatusBadge status={user.status} label={t(`status.${user.status}`)} />
                    {user.studentId ? <Badge tone="neutral">student:{user.studentId}</Badge> : null}
                    {user.teacherId ? <Badge tone="neutral">teacher:{user.teacherId}</Badge> : null}
                    {user.guardianStudentIds?.length ? <Badge tone="neutral">{user.guardianStudentIds.length} {locale === "bn" ? "সন্তান" : "children"}</Badge> : null}
                    <span className="hidden text-xs text-slate-400 sm:inline">{formatDate(user.createdAt, locale)}</span>
                    <Button size="sm" variant="outline" onClick={() => setEditing({ ...user })}>{t("common.edit")}</Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("users.create")}
        description={t("users.createNote")}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>{t("common.cancel")}</Button>
            <Button onClick={submitCreate} loading={busy}>{t("common.create")}</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("auth.email")} htmlFor="u-email" required className="sm:col-span-2">
            <Input id="u-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </Field>
          <Field label={t("auth.password")} htmlFor="u-password" required hint={t("validation.passwordMin")}>
            <Input id="u-password" type="text" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </Field>
          <Field label={locale === "bn" ? "ভূমিকা" : "Role"} htmlFor="u-role" required>
            <Select id="u-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
              {PROVISIONABLE_ROLES.map((item) => (
                <option key={item} value={item}>{t(`role.${item}`)}</option>
              ))}
            </Select>
          </Field>
          <Field label={locale === "bn" ? "নাম (ইংরেজি)" : "Display name"} htmlFor="u-name" required>
            <Input id="u-name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
          </Field>
          <Field label={locale === "bn" ? "নাম (বাংলা)" : "Display name (Bengali)"} htmlFor="u-name-bn">
            <Input id="u-name-bn" className="bn" value={form.displayNameBn} onChange={(event) => setForm({ ...form, displayNameBn: event.target.value })} />
          </Field>
          <Field label={t("common.phone")} htmlFor="u-phone">
            <Input id="u-phone" value={form.phone ?? ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </Field>
          <Field label={locale === "bn" ? "শিক্ষার্থী আইডি" : "Student ID"} htmlFor="u-student" hint={form.role === "student" ? undefined : undefined}>
            <Input id="u-student" value={form.studentId ?? ""} onChange={(event) => setForm({ ...form, studentId: event.target.value })} placeholder={form.role === "student" ? "stu-0001" : "—"} />
          </Field>
          <Field label={locale === "bn" ? "শিক্ষক আইডি" : "Teacher ID"} htmlFor="u-teacher">
            <Input id="u-teacher" value={form.teacherId ?? ""} onChange={(event) => setForm({ ...form, teacherId: event.target.value })} placeholder={form.role === "teacher" ? "tch-01" : "—"} />
          </Field>
          <Field label={locale === "bn" ? "সন্তানের আইডি (কমা দিয়ে)" : "Children IDs (comma separated)"} htmlFor="u-guardian" className="sm:col-span-2">
            <Input id="u-guardian" value={guardianIds} onChange={(event) => setGuardianIds(event.target.value)} placeholder={form.role === "parent" ? "stu-0001, stu-0002" : "—"} />
          </Field>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">{t("users.recovery")}</p>
      </Dialog>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={t("common.edit")}
        description={editing?.email}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>{t("common.cancel")}</Button>
            <Button onClick={submitEdit} loading={busy}>{t("common.save")}</Button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={locale === "bn" ? "নাম" : "Display name"} htmlFor="e-name">
              <Input id="e-name" value={editing.displayName} onChange={(event) => setEditing({ ...editing, displayName: event.target.value })} />
            </Field>
            <Field label={locale === "bn" ? "নাম (বাংলা)" : "Display name (Bengali)"} htmlFor="e-name-bn">
              <Input id="e-name-bn" className="bn" value={editing.displayNameBn ?? ""} onChange={(event) => setEditing({ ...editing, displayNameBn: event.target.value })} />
            </Field>
            <Field label={t("common.phone")} htmlFor="e-phone">
              <Input id="e-phone" value={editing.phone ?? ""} onChange={(event) => setEditing({ ...editing, phone: event.target.value })} />
            </Field>
            <Field label={locale === "bn" ? "ভূমিকা" : "Role"} htmlFor="e-role" hint={locale === "bn" ? "নিয়ম অনুযায়ী কেবল প্রশাসক ভূমিকা পরিবর্তন করতে পারেন।" : "Only administrators may change roles; rules enforce this."}>
              <Select id="e-role" value={editing.role} onChange={(event) => setEditing({ ...editing, role: event.target.value as Role })}>
                {(["admin", ...PROVISIONABLE_ROLES] as Role[]).map((item) => (
                  <option key={item} value={item}>{t(`role.${item}`)}</option>
                ))}
              </Select>
            </Field>
            <Field label={t("common.status")} htmlFor="e-status" className="sm:col-span-2">
              <Select id="e-status" value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as SchoolUser["status"] })}>
                <option value="active">{t("status.active")}</option>
                <option value="disabled">{t("status.disabled")}</option>
                <option value="invited">{t("status.invited")}</option>
              </Select>
            </Field>
            <p className="sm:col-span-2 text-xs text-slate-500">UID: <span className="font-mono">{editing.uid}</span> · {initials(editing.displayName)}</p>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={recoverOpen}
        onClose={() => setRecoverOpen(false)}
        title={locale === "bn" ? "প্রোফাইল পুনরুদ্ধার" : "Recover profile"}
        description={t("users.recovery")}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRecoverOpen(false)} disabled={busy}>{t("common.cancel")}</Button>
            <Button onClick={submitRecovery} loading={busy}>{t("common.save")}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="UID" htmlFor="r-uid" required>
            <Input id="r-uid" value={recovery.uid} onChange={(event) => setRecovery({ ...recovery, uid: event.target.value })} className="font-mono" />
          </Field>
          <Field label={t("auth.email")} htmlFor="r-email" required>
            <Input id="r-email" type="email" value={recovery.email} onChange={(event) => setRecovery({ ...recovery, email: event.target.value })} />
          </Field>
          <Field label={locale === "bn" ? "নাম" : "Display name"} htmlFor="r-name" required>
            <Input id="r-name" value={recovery.displayName} onChange={(event) => setRecovery({ ...recovery, displayName: event.target.value })} />
          </Field>
          <Field label={locale === "bn" ? "ভূমিকা" : "Role"} htmlFor="r-role" required>
            <Select id="r-role" value={recovery.role} onChange={(event) => setRecovery({ ...recovery, role: event.target.value as Role })}>
              {PROVISIONABLE_ROLES.map((item) => (
                <option key={item} value={item}>{t(`role.${item}`)}</option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-slate-500">
            {locale === "bn" ? "এখানেও প্রশাসক ভূমিকা তৈরি করা যাবে না।" : "Administrator roles cannot be created here either."}
          </p>
        </div>
      </Dialog>
    </>
  );
}
