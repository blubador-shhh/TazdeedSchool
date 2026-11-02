/* eslint-disable @next/next/no-page-custom-font -- This is the App Router root
   layout: the Bengali-capable webfont links below apply to every page, so the
   pages-router warning does not apply. */
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: {
    default: "Tazdeed School | তাজদীদ স্কুল",
    template: "%s | Tazdeed School",
  },
  description:
    "Tazdeed School public website and school management system — admissions, notices, events, gallery and a role-based ERP for administrators, teachers, accountants, librarians, students and parents.",
  applicationName: "Tazdeed School",
  keywords: ["Tazdeed School", "school management", "admission", "results", "তাজদীদ স্কুল"],
};

export const viewport: Viewport = {
  themeColor: "#173B68",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout. Bengali-first (`lang="bn"`) with a Bengali-capable webfont and a
 * Latin fallback. Fonts are linked rather than compiled with next/font so the
 * static export never depends on network access at build time.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/svg+xml" href="/images/tazdeed-school-logo.svg" />
      </head>
      <body className="flex min-h-screen flex-col bg-soft text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
