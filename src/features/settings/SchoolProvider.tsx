"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DATA_MODE, SCHOOL_ID } from "@/lib/firebase/client";
import { getDocById } from "@/lib/data/store";
import { ensureLocalSeed } from "@/lib/data/seed";
import { describeError } from "@/lib/utils/cn";
import type { PublicSiteContent, SchoolSettings } from "@/types";

/**
 * School configuration + public website content.
 *
 * Loaded once per browser session and cached in a module-level variable so
 * navigating between public pages does not re-read the same two documents
 * (Firestore reads matter on the Spark plan).
 */

interface SchoolValue {
  settings: SchoolSettings | null;
  site: PublicSiteContent | null;
  loading: boolean;
  error: string | null;
  schoolId: string;
  mode: "firebase" | "local";
  reload: () => void;
}

const cache: { settings: SchoolSettings | null; site: PublicSiteContent | null } = {
  settings: null,
  site: null,
};

const SchoolContext = createContext<SchoolValue | null>(null);

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SchoolSettings | null>(cache.settings);
  const [site, setSite] = useState<PublicSiteContent | null>(cache.site);
  const [loading, setLoading] = useState(!cache.settings);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (DATA_MODE === "local") await ensureLocalSeed();
        const [settingsDoc, siteDoc] = await Promise.all([
          getDocById<SchoolSettings>("schoolSettings", SCHOOL_ID),
          getDocById<PublicSiteContent>("publicSiteContent", "home"),
        ]);
        if (!active) return;
        cache.settings = settingsDoc;
        cache.site = siteDoc;
        setSettings(settingsDoc);
        setSite(siteDoc);
      } catch (cause) {
        if (active) setError(describeError(cause));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [nonce]);

  const reload = useCallback(() => {
    cache.settings = null;
    cache.site = null;
    setNonce((value) => value + 1);
  }, []);

  const value = useMemo<SchoolValue>(
    () => ({ settings, site, loading, error, schoolId: SCHOOL_ID, mode: DATA_MODE, reload }),
    [settings, site, loading, error, reload],
  );

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool(): SchoolValue {
  return (
    useContext(SchoolContext) ?? {
      settings: null,
      site: null,
      loading: false,
      error: null,
      schoolId: SCHOOL_ID,
      mode: DATA_MODE,
      reload: () => undefined,
    }
  );
}

export function schoolName(settings: SchoolSettings | null, locale: "bn" | "en"): string {
  if (!settings) return locale === "bn" ? "তাজদীদ স্কুল" : "Tazdeed School";
  return (locale === "bn" ? settings.nameBn : settings.nameEn) || settings.nameEn || "Tazdeed School";
}
