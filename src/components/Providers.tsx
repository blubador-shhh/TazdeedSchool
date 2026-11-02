"use client";

import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui/overlays";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { SchoolProvider } from "@/features/settings/SchoolProvider";
import type { Locale } from "@/types";

export function Providers({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <ToastProvider>
        <AuthProvider>
          <SchoolProvider>{children}</SchoolProvider>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
