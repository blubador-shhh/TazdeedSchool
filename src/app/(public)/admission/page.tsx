"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, ClipboardList, FileCheck2, Users, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useCollection } from "@/hooks/useCollection";
import { createDoc } from "@/lib/data/store";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { isValidEmail, isBangladeshiPhone } from "@/lib/validators";
import { describeError } from "@/lib/utils/cn";
import { Button, Card, CardContent, CardHeader, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/overlays";
import { PageHero, Section } from "@/components/public/Cards";
import type { AdmissionApplication, ClassRoom } from "@/types";

const admissionSchema = z.object({
  studentName: z.string().trim().min(2).max(80),
  studentNameBn: z.string().trim().max(80).optional().or(z.literal("")),
  dateOfBirth: z.string().min(10),
  gender: z.enum(["male", "female", "other"]),
  applyingClassId: z.string().min(1),
  guardianName: z.string().trim().min(2).max(80),
  guardianPhone: z.string().trim().min(11).max(16),
  guardianEmail: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  previousSchool: z.string().trim().max(120).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

type AdmissionForm = z.infer<typeof admissionSchema>;

const STEPS = [
  { icon: ClipboardList, bn: "অনলাইন আবেদন ফর্ম পূরণ", en: "Complete the online application form" },
  { icon: FileCheck2, bn: "প্রয়োজনীয় কাগজপত্র যাচাই", en: "Document verification at the office" },
  { icon: Users, bn: "ভর্তি পরীক্ষা ও সাক্ষাৎকার", en: "Admission test and interview" },
  { icon: Wallet, bn: "বেতন পরিশোধ ও ভর্তি নিশ্চিতকরণ", en: "Fee payment and enrolment confirmation" },
];

export default function AdmissionPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [submitted, setSubmitted] = useState(false);
  const classes = useCollection<ClassRoom>("classes", { where: [["isActive", "==", true]], orderBy: [["numericLevel", "asc"]], limit: 60 });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdmissionForm>({
    resolver: zodResolver(admissionSchema),
    defaultValues: { gender: "male", applyingClassId: "" },
  });

  async function onSubmit(values: AdmissionForm) {
    if (values.guardianEmail && !isValidEmail(values.guardianEmail)) {
      toast.error(t("validation.email"));
      return;
    }
    if (!isBangladeshiPhone(values.guardianPhone)) {
      toast.error(t("validation.phone"));
      return;
    }
    try {
      // Public creates are restricted by firestore.rules: only these fields,
      // status forced to `pending`, source forced to `public-website`.
      await createDoc<Omit<AdmissionApplication, "id" | "createdAt" | "updatedAt">>("admissionApplications", {
        schoolId: SCHOOL_ID,
        studentName: values.studentName,
        studentNameBn: values.studentNameBn || undefined,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender,
        applyingClassId: values.applyingClassId,
        guardianName: values.guardianName,
        guardianPhone: values.guardianPhone,
        guardianEmail: values.guardianEmail || undefined,
        address: values.address || undefined,
        previousSchool: values.previousSchool || undefined,
        note: values.note || undefined,
        status: "pending",
        source: "public-website",
      });
      setSubmitted(true);
      reset();
      toast.success(t("admission.success"));
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    }
  }

  return (
    <>
      <PageHero eyebrow={t("nav.admission")} title={t("admission.title")} subtitle={t("admission.subtitle")} />

      <Section className="bg-white">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.25fr]">
          <div>
            <h2 className="text-xl font-bold text-navy-700">{t("admission.processTitle")}</h2>
            <ol className="mt-5 space-y-4">
              {STEPS.map((step, index) => (
                <li key={step.en} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-royal-50 text-sm font-bold text-royal-700">
                    {index + 1}
                  </span>
                  <div className="pt-1.5">
                    <p className="text-sm font-semibold text-slate-900">{locale === "bn" ? step.bn : step.en}</p>
                  </div>
                  <step.icon className="ml-auto size-5 self-center text-slate-300" aria-hidden="true" />
                </li>
              ))}
            </ol>
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
              {t("admission.note")}
            </div>
            {submitted ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <p>{t("admission.success")}</p>
              </div>
            ) : null}
          </div>

          <Card>
            <CardHeader title={t("admission.formTitle")} description={locale === "bn" ? "সব ঘর পূরণ করা আবশ্যক।" : "All required fields must be completed."} />
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
                <Field label={locale === "bn" ? "শিক্ষার্থীর নাম (ইংরেজি)" : "Student name (English)"} htmlFor="studentName" required error={errors.studentName ? t("validation.required") : undefined}>
                  <Input id="studentName" invalid={Boolean(errors.studentName)} {...register("studentName")} />
                </Field>
                <Field label={locale === "bn" ? "শিক্ষার্থীর নাম (বাংলা)" : "Student name (Bengali)"} htmlFor="studentNameBn">
                  <Input id="studentNameBn" className="bn" {...register("studentNameBn")} />
                </Field>
                <Field label={locale === "bn" ? "জন্মতারিখ" : "Date of birth"} htmlFor="dateOfBirth" required error={errors.dateOfBirth ? t("validation.date") : undefined}>
                  <Input id="dateOfBirth" type="date" invalid={Boolean(errors.dateOfBirth)} {...register("dateOfBirth")} />
                </Field>
                <Field label={locale === "bn" ? "লিঙ্গ" : "Gender"} htmlFor="gender" required>
                  <Select id="gender" {...register("gender")}>
                    <option value="male">{locale === "bn" ? "ছেলে" : "Male"}</option>
                    <option value="female">{locale === "bn" ? "মেয়ে" : "Female"}</option>
                    <option value="other">{locale === "bn" ? "অন্যান্য" : "Other"}</option>
                  </Select>
                </Field>
                <Field label={t("common.class")} htmlFor="applyingClassId" required error={errors.applyingClassId ? t("validation.required") : undefined} className="sm:col-span-2">
                  <Select id="applyingClassId" invalid={Boolean(errors.applyingClassId)} {...register("applyingClassId")}>
                    <option value="">{locale === "bn" ? "শ্রেণি নির্বাচন করুন" : "Select a class"}</option>
                    {(classes.rows ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {locale === "bn" ? item.nameBn || item.name : item.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={locale === "bn" ? "অভিভাবকের নাম" : "Guardian name"} htmlFor="guardianName" required error={errors.guardianName ? t("validation.required") : undefined}>
                  <Input id="guardianName" invalid={Boolean(errors.guardianName)} {...register("guardianName")} />
                </Field>
                <Field label={locale === "bn" ? "অভিভাবকের মোবাইল" : "Guardian mobile"} htmlFor="guardianPhone" required error={errors.guardianPhone ? t("validation.phone") : undefined}>
                  <Input id="guardianPhone" inputMode="tel" placeholder="01XXXXXXXXX" invalid={Boolean(errors.guardianPhone)} {...register("guardianPhone")} />
                </Field>
                <Field label={locale === "bn" ? "ইমেইল" : "Email"} htmlFor="guardianEmail" error={errors.guardianEmail ? t("validation.email") : undefined} className="sm:col-span-2">
                  <Input id="guardianEmail" type="email" invalid={Boolean(errors.guardianEmail)} {...register("guardianEmail")} />
                </Field>
                <Field label={t("common.address")} htmlFor="address" className="sm:col-span-2">
                  <Input id="address" {...register("address")} />
                </Field>
                <Field label={locale === "bn" ? "পূর্ববর্তী স্কুল" : "Previous school"} htmlFor="previousSchool" className="sm:col-span-2">
                  <Input id="previousSchool" {...register("previousSchool")} />
                </Field>
                <Field label={t("common.notes")} htmlFor="note" className="sm:col-span-2">
                  <Textarea id="note" rows={3} {...register("note")} />
                </Field>
                <div className="sm:col-span-2">
                  <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? t("common.saving") : t("admission.submit")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}
