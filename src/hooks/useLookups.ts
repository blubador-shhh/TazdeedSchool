"use client";

import { useEffect, useMemo, useState } from "react";
import { listDocs } from "@/lib/data/store";
import type { ClassRoom, Section, Student, Subject } from "@/types";

/**
 * Small lookup caches shared by the finance, examination and library screens.
 * Each is fetched once per screen with a bounded query — never an unbounded
 * collection scan.
 */
export interface Lookups {
  students: Record<string, Student>;
  classes: Record<string, ClassRoom>;
  sections: Record<string, Section>;
  subjects: Record<string, Subject>;
  loading: boolean;
}

export function useLookups(options: { students?: boolean; classes?: boolean; sections?: boolean; subjects?: boolean } = {}): Lookups {
  const [state, setState] = useState<Lookups>({ students: {}, classes: {}, sections: {}, subjects: {}, loading: true });

  useEffect(() => {
    let active = true;
    async function load() {
      const [studentsRes, classesRes, sectionsRes, subjectsRes] = await Promise.all([
        options.students === false ? Promise.resolve({ rows: [] as Student[] }) : listDocs<Student>("students", { limit: 500, orderBy: [["admissionNo", "asc"]] }),
        options.classes === false ? Promise.resolve({ rows: [] as ClassRoom[] }) : listDocs<ClassRoom>("classes", { limit: 60 }),
        options.sections === false ? Promise.resolve({ rows: [] as Section[] }) : listDocs<Section>("sections", { limit: 120 }),
        options.subjects === false ? Promise.resolve({ rows: [] as Subject[] }) : listDocs<Subject>("subjects", { limit: 200 }),
      ]);
      if (!active) return;
      setState({
        students: Object.fromEntries(studentsRes.rows.map((row) => [row.id, row])),
        classes: Object.fromEntries(classesRes.rows.map((row) => [row.id, row])),
        sections: Object.fromEntries(sectionsRes.rows.map((row) => [row.id, row])),
        subjects: Object.fromEntries(subjectsRes.rows.map((row) => [row.id, row])),
        loading: false,
      });
    }
    void load();
    return () => {
      active = false;
    };
  }, [options.students, options.classes, options.sections, options.subjects]);

  return state;
}

export function useStudentNames(locale: "bn" | "en") {
  const lookups = useLookups({ classes: false, sections: false, subjects: false });

  const names = useMemo(() => {
    const next: Record<string, string> = {};
    Object.values(lookups.students).forEach((student) => {
      next[student.id] = locale === "bn" ? student.fullNameBn || student.fullName : student.fullName;
    });
    return next;
  }, [lookups.students, locale]);

  return { names, lookups };
}
