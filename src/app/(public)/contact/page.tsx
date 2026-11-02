"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Clock, Mail, MapPin, Phone, TriangleAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSchool } from "@/features/settings/SchoolProvider";
import { createDoc } from "@/lib/data/store";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { isSafeLinkUrl, isValidEmail } from "@/lib/validators";
import { describeError } from "@/lib/utils/cn";
import { Button, Card, CardContent, CardHeader, Field, Input, Textarea } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/overlays";
import { PageHero, Section } from "@/components/public/Cards";
import type { ContactMessage } from "@/types";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(1500),
});

type ContactForm = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const { t, locale } = useI18n();
  const { settings } = useSchool();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({ resolver: zodResolver(contactSchema) });

  const mapUrl = settings?.mapUrl && isSafeLinkUrl(settings.mapUrl) ? settings.mapUrl : null;

  async function onSubmit(values: ContactForm) {
    if (values.email && !isValidEmail(values.email)) {
      toast.error(t("validation.email"));
      return;
    }
    try {
      await createDoc<Omit<ContactMessage, "id" | "createdAt" | "updatedAt">>("contactMessages", {
        schoolId: SCHOOL_ID,
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        subject: values.subject,
        message: values.message,
        status: "new",
        source: "public-website",
      });
      reset();
      toast.success(t("contact.success"));
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    }
  }

  const address = locale === "bn" ? settings?.addressBn || settings?.addressEn : settings?.addressEn || settings?.addressBn;

  return (
    <>
      <PageHero eyebrow={t("nav.contact")} title={t("contact.title")} subtitle={t("contact.subtitle")} />
      <Section className="bg-white">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader title={t("home.contactUs")} />
              <CardContent className="space-y-4 text-sm">
                <p className="flex items-start gap-3 text-slate-700">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-royal-600" />
                  <span>{address || t("contact.notConfigured")}</span>
                </p>
                {settings?.phone ? (
                  <a href={`tel:${settings.phone}`} className="flex items-center gap-3 text-slate-700 hover:text-royal-700">
                    <Phone className="size-4 shrink-0 text-royal-600" /> {settings.phone}
                  </a>
                ) : null}
                {settings?.email ? (
                  <a href={`mailto:${settings.email}`} className="flex items-center gap-3 text-slate-700 hover:text-royal-700">
                    <Mail className="size-4 shrink-0 text-royal-600" /> {settings.email}
                  </a>
                ) : null}
                {settings?.openingHours ? (
                  <p className="flex items-start gap-3 text-slate-700">
                    <Clock className="mt-0.5 size-4 shrink-0 text-royal-600" /> {settings.openingHours}
                  </p>
                ) : null}
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-royal-400 hover:text-royal-700"
                  >
                    <MapPin className="size-4" /> {locale === "bn" ? "মানচিত্রে দেখুন" : "Open in maps"}
                  </a>
                ) : null}
                {!settings?.phone && !settings?.email ? (
                  <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                    {t("contact.notConfigured")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/60">
              <CardContent className="text-xs leading-relaxed text-amber-900">
                {locale === "bn"
                  ? "এই সাইটে কোনো সার্ভার নেই, তাই ফর্মের বার্তা সরাসরি Cloud Firestore-এ লেখা হয় (কেবল তৈরির অনুমতি)। এটি সম্পূর্ণ স্প্যাম-মুক্ত নয় — জরুরি প্রয়োজনে ফোন বা ইমেইল ব্যবহার করুন।"
                  : "This site has no server, so messages are written directly to Cloud Firestore with a create-only rule. That cannot be made fully spam-proof — for urgent matters please use phone or email."}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader title={t("contact.formTitle")} />
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
                <Field label={t("common.name")} htmlFor="name" required error={errors.name ? t("validation.required") : undefined}>
                  <Input id="name" invalid={Boolean(errors.name)} {...register("name")} />
                </Field>
                <Field label={t("common.phone")} htmlFor="phone">
                  <Input id="phone" inputMode="tel" {...register("phone")} />
                </Field>
                <Field label={t("common.email")} htmlFor="email" error={errors.email ? t("validation.email") : undefined} className="sm:col-span-2">
                  <Input id="email" type="email" invalid={Boolean(errors.email)} {...register("email")} />
                </Field>
                <Field label={locale === "bn" ? "বিষয়" : "Subject"} htmlFor="subject" required error={errors.subject ? t("validation.required") : undefined} className="sm:col-span-2">
                  <Input id="subject" invalid={Boolean(errors.subject)} {...register("subject")} />
                </Field>
                <Field label={locale === "bn" ? "বার্তা" : "Message"} htmlFor="message" required error={errors.message ? (locale === "bn" ? "কমপক্ষে ১০ অক্ষর লিখুন।" : "Write at least 10 characters.") : undefined} className="sm:col-span-2">
                  <Textarea id="message" rows={5} invalid={Boolean(errors.message)} {...register("message")} />
                </Field>
                <div className="sm:col-span-2">
                  <Button type="submit" size="lg" loading={isSubmitting}>
                    {isSubmitting ? t("common.saving") : t("contact.send")}
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
