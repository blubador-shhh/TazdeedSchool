"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff, KeyRound, LogIn, ShieldAlert, TriangleAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { useSchool } from "@/features/settings/SchoolProvider";
import { DEMO_USERS } from "@/lib/data/seed";
import { describeError } from "@/lib/utils/cn";
import { Button, Card, CardContent, Field, Input } from "@/components/ui/primitives";
import { Dialog, useToast } from "@/components/ui/overlays";
import { Logo } from "@/components/layout/Logo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { DemoBanner } from "@/components/layout/PublicShell";

const loginSchema = z.object({
  email: z.string().trim().min(3),
  password: z.string().min(6),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const { signIn, sendReset, status, uid } = useAuth();
  const { mode } = useSchool();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (status === "signed-in" && uid) router.replace("/dashboard/");
  }, [status, uid, router]);

  async function onSubmit(values: LoginForm) {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      router.replace("/dashboard/");
    } catch (cause) {
      const message = describeError(cause);
      setFormError(message);
      toast.error(t("auth.loginTitle"), message);
    }
  }

  async function onReset() {
    if (!resetEmail.trim()) return;
    try {
      await sendReset(resetEmail.trim());
      toast.success(t("auth.resetSent"));
      setResetOpen(false);
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-navy-50 via-white to-royal-50">
      <DemoBanner />
      <header className="no-print flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Logo />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-700">
            <ArrowLeft className="size-4" /> {t("nav.home")}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 bg-navy-600 px-6 py-6 text-white">
              <span className="grid size-11 place-items-center rounded-xl bg-white/15">
                <LogIn className="size-5" />
              </span>
              <h1 className="mt-4 text-xl font-bold tracking-tight">{t("auth.loginTitle")}</h1>
              <p className="mt-1 text-sm text-slate-200">{t("auth.loginSubtitle")}</p>
            </div>
            <CardContent className="p-6">
              {status === "no-profile" ? (
                <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" /> {t("auth.noProfile")}
                </p>
              ) : null}
              {status === "disabled" ? (
                <p className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-900">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {t("auth.accountDisabled")}
                </p>
              ) : null}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <Field label={t("auth.email")} htmlFor="email" required error={errors.email ? t("validation.email") : undefined}>
                  <Input id="email" type="email" autoComplete="username" placeholder="name@tazdeed.school" invalid={Boolean(errors.email)} {...register("email")} />
                </Field>
                <Field label={t("auth.password")} htmlFor="password" required error={errors.password ? t("validation.passwordMin") : undefined}>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="pr-10"
                      invalid={Boolean(errors.password)}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>

                {formError ? (
                  <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
                    {formError}
                  </p>
                ) : null}

                <Button type="submit" size="lg" className="w-full" loading={isSubmitting} icon={<LogIn className="size-4" />}>
                  {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
                </Button>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
                <button type="button" onClick={() => setResetOpen(true)} className="inline-flex items-center gap-1.5 font-semibold text-royal-700 hover:underline">
                  <KeyRound className="size-3.5" /> {t("auth.forgot")}
                </button>
                <span className="text-slate-500">{t("auth.noAccount")}</span>
              </div>

              {mode === "local" ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-soft p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <ShieldAlert className="size-3.5" /> {t("auth.demoCredentials")}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {DEMO_USERS.map((user) => (
                      <li key={user.uid}>
                        <button
                          type="button"
                          onClick={() => {
                            setValue("email", user.email);
                            setValue("password", user.password);
                            setFormError(null);
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-xs transition-colors hover:border-royal-300"
                        >
                          <span className="font-medium text-slate-700">{t(`role.${user.role}`)}</span>
                          <span className="truncate text-slate-500">{user.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                    {locale === "bn"
                      ? "এগুলো শুধু ডেমো লগইন; Firebase যুক্ত করলে আসল অ্যাকাউন্ট ব্যবহার হবে।"
                      : "Demo sign-ins only. Once Firebase is configured, real Authentication accounts are used."}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t("auth.forgot")}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setResetOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={onReset}>{t("auth.sendReset")}</Button>
          </>
        }
      >
        <Field label={t("auth.email")} htmlFor="reset-email">
          <Input id="reset-email" type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} />
        </Field>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {mode === "local"
            ? locale === "bn"
              ? "পাসওয়ার্ড রিসেটের জন্য Firebase Authentication প্রয়োজন।"
              : "Password reset requires a configured Firebase Authentication project."
            : locale === "bn"
              ? "আপনার ইমেইলে একটি রিসেট লিংক পাঠানো হবে।"
              : "A reset link is sent to the account email address."}
        </p>
      </Dialog>
    </div>
  );
}
