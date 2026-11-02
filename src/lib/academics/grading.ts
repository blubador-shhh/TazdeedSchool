import type { GradeBand, GradingRule, SubjectResult } from "@/types";

/**
 * Examination business logic.
 *
 * Grading scales are **configurable per exam** (stored in `gradingRules`), so
 * no scale is hardcoded in the UI. Every rule states explicitly how absent
 * students, missing marks, rounding and optional subjects are handled.
 * Covered by tests/unit/grading.test.ts.
 */

export interface GradeBandInput extends GradeBand {}

export const DEFAULT_GRADING_RULE = {
  name: "Standard 5.00 scale",
  bands: [
    { grade: "A+", point: 5, minPercent: 80 },
    { grade: "A", point: 4, minPercent: 70 },
    { grade: "A-", point: 3.5, minPercent: 60 },
    { grade: "B", point: 3.25, minPercent: 50 },
    { grade: "C", point: 2, minPercent: 40 },
    { grade: "D", point: 1, minPercent: 33 },
  ] satisfies GradeBandInput[],
  failGrade: "F",
  failPoint: 0,
  rounding: "half-up" as const,
  decimals: 2,
  dropFailedOptional: true,
  absentCountsAsFail: true,
};

export type MarkInput = {
  subjectId: string;
  subjectName?: string;
  maximumMarks: number;
  passMarks: number;
  obtainedMarks: number | null;
  status: "pending" | "entered" | "absent";
  isOptional?: boolean;
  creditHours?: number;
};

export function validateGradingRule(rule: Pick<GradingRule, "bands" | "failGrade" | "decimals">): string[] {
  const errors: string[] = [];
  if (!rule.bands || rule.bands.length === 0) errors.push("At least one grade band is required.");
  const seen = new Set<string>();
  let previousMin = Number.POSITIVE_INFINITY;
  let previousPoint = Number.POSITIVE_INFINITY;
  for (const band of rule.bands ?? []) {
    if (seen.has(band.grade)) errors.push(`Duplicate grade "${band.grade}".`);
    seen.add(band.grade);
    if (!Number.isFinite(band.minPercent) || band.minPercent < 0 || band.minPercent > 100) {
      errors.push(`Grade "${band.grade}" needs a minimum percentage between 0 and 100.`);
    }
    if (band.minPercent >= previousMin) {
      errors.push(`Grade bands must be ordered from the highest minimum percentage down ("${band.grade}").`);
    }
    if (band.point > previousPoint) {
      errors.push(`Grade points must not increase as the minimum percentage decreases ("${band.grade}").`);
    }
    previousMin = band.minPercent;
    previousPoint = band.point;
  }
  if (rule.decimals < 0 || rule.decimals > 4) errors.push("Decimals must be between 0 and 4.");
  return errors;
}

export function roundValue(value: number, rule: Pick<GradingRule, "rounding" | "decimals">): number {
  const factor = 10 ** Math.max(0, rule.decimals ?? 2);
  const scaled = value * factor;
  const rounded =
    rule.rounding === "floor" ? Math.floor(scaled) : rule.rounding === "none" ? scaled : Math.round(scaled);
  return Number((rounded / factor).toFixed(6));
}

export function resolveBand(percent: number, rule: Pick<GradingRule, "bands">): GradeBand | null {
  const ordered = [...(rule.bands ?? [])].sort((a, b) => b.minPercent - a.minPercent);
  return ordered.find((band) => percent >= band.minPercent) ?? null;
}

export function subjectPercent(mark: Pick<MarkInput, "obtainedMarks" | "maximumMarks">): number | null {
  if (mark.obtainedMarks === null || mark.obtainedMarks === undefined) return null;
  const max = Number(mark.maximumMarks);
  if (!Number.isFinite(max) || max <= 0) return null;
  const obtained = Math.max(0, Math.min(max, Number(mark.obtainedMarks)));
  return (obtained / max) * 100;
}

export function computeSubjectResult(mark: MarkInput, rule: GradingRule): SubjectResult {
  const maximumMarks = Math.max(0, Number(mark.maximumMarks) || 0);
  const passMarks = Math.max(0, Number(mark.passMarks) || 0);
  const base = {
    subjectId: mark.subjectId,
    subjectName: mark.subjectName ?? mark.subjectId,
    maximumMarks,
    passMarks,
  };

  if (mark.status === "absent") {
    const failed = rule.absentCountsAsFail;
    return {
      ...base,
      obtainedMarks: 0,
      percent: 0,
      grade: failed ? rule.failGrade : "—",
      point: failed ? rule.failPoint : 0,
      status: "absent",
      counted: failed,
    };
  }

  if (mark.status === "pending" || mark.obtainedMarks === null) {
    // Missing marks are never guessed and never silently counted as zero.
    return { ...base, obtainedMarks: null, percent: null, grade: "—", point: 0, status: "missing", counted: false };
  }

  const obtained = Math.max(0, Math.min(maximumMarks, Number(mark.obtainedMarks)));
  const percent = subjectPercent({ obtainedMarks: obtained, maximumMarks }) ?? 0;
  const passed = obtained >= passMarks && percent >= (rule.bands.at(-1)?.minPercent ?? 0);

  if (!passed) {
    if (mark.isOptional && rule.dropFailedOptional) {
      return {
        ...base,
        obtainedMarks: obtained,
        percent: roundValue(percent, rule),
        grade: rule.failGrade,
        point: 0,
        status: "excluded-optional",
        counted: false,
      };
    }
    return {
      ...base,
      obtainedMarks: obtained,
      percent: roundValue(percent, rule),
      grade: rule.failGrade,
      point: rule.failPoint,
      status: "failed",
      counted: true,
    };
  }

  const band = resolveBand(percent, rule);
  return {
    ...base,
    obtainedMarks: obtained,
    percent: roundValue(percent, rule),
    grade: band?.grade ?? rule.failGrade,
    point: band?.point ?? rule.failPoint,
    status: "passed",
    counted: true,
  };
}

export interface ResultComputationInput {
  marks: MarkInput[];
  rule: GradingRule;
}

export interface ResultComputation {
  subjects: SubjectResult[];
  totalMarks: number;
  totalMaximum: number;
  percentage: number;
  grade: string;
  gpa: number;
  failedSubjects: number;
  missingSubjects: number;
  status: "passed" | "failed" | "incomplete";
  computable: boolean;
}

export function computeResult({ marks, rule }: ResultComputationInput): ResultComputation {
  const subjects = marks.map((mark) => computeSubjectResult(mark, rule));
  const counted = subjects.filter((subject) => subject.counted);
  const missing = subjects.filter((subject) => subject.status === "missing");

  const totalMarks = counted.reduce((sum, subject) => sum + (subject.obtainedMarks ?? 0), 0);
  const totalMaximum = counted.reduce((sum, subject) => sum + subject.maximumMarks, 0);
  const percentage = totalMaximum > 0 ? roundValue((totalMarks / totalMaximum) * 100, rule) : 0;

  const weighted = counted.reduce((sum, subject) => {
    const mark = marks.find((m) => m.subjectId === subject.subjectId);
    const weight = mark?.creditHours && mark.creditHours > 0 ? mark.creditHours : 1;
    return sum + subject.point * weight;
  }, 0);
  const weightTotal = counted.reduce((sum, subject) => {
    const mark = marks.find((m) => m.subjectId === subject.subjectId);
    return sum + (mark?.creditHours && mark.creditHours > 0 ? mark.creditHours : 1);
  }, 0);
  const gpa = weightTotal > 0 ? roundValue(weighted / weightTotal, rule) : 0;

  const failedSubjects = counted.filter(
    (subject) => subject.status === "failed" || subject.status === "absent",
  ).length;

  const band = resolveBand(percentage, rule);
  const computable = counted.length > 0;
  const status: ResultComputation["status"] = !computable
    ? "incomplete"
    : failedSubjects > 0
      ? "failed"
      : "passed";

  return {
    subjects,
    totalMarks,
    totalMaximum,
    percentage,
    grade: status === "failed" ? rule.failGrade : (band?.grade ?? rule.failGrade),
    gpa: status === "failed" ? rule.failPoint : gpa,
    failedSubjects,
    missingSubjects: missing.length,
    status,
    computable,
  };
}

/**
 * Merit positions with shared ranks for ties (1, 2, 2, 4 …).
 * Failed students are ranked after every passed student.
 */
export function computeMeritPositions<T extends { studentId: string; gpa: number; totalMarks: number; status: string }>(
  results: T[],
): Map<string, number> {
  const sorted = [...results].sort((a, b) => {
    const aFailed = a.status === "failed" ? 1 : 0;
    const bFailed = b.status === "failed" ? 1 : 0;
    if (aFailed !== bFailed) return aFailed - bFailed;
    if (b.gpa !== a.gpa) return b.gpa - a.gpa;
    return b.totalMarks - a.totalMarks;
  });

  const positions = new Map<string, number>();
  let rank = 0;
  let previousKey = "";
  sorted.forEach((result, index) => {
    const key = `${result.status}|${result.gpa}|${result.totalMarks}`;
    if (key !== previousKey) {
      rank = index + 1;
      previousKey = key;
    }
    positions.set(result.studentId, rank);
  });
  return positions;
}

/** Tabulation sheet rows for printing. */
export function tabulationRow(studentName: string, result: ResultComputation, rollNo?: string) {
  return {
    studentName,
    rollNo: rollNo ?? "",
    totalMarks: result.totalMarks,
    totalMaximum: result.totalMaximum,
    percentage: result.percentage,
    gpa: result.gpa,
    grade: result.grade,
    status: result.status,
  };
}
