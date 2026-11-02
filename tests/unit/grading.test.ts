import { describe, expect, it } from "vitest";
import {
  DEFAULT_GRADING_RULE,
  computeMeritPositions,
  computeResult,
  computeSubjectResult,
  resolveBand,
  roundValue,
  validateGradingRule,
  type MarkInput,
} from "@/lib/academics/grading";
import type { GradingRule } from "@/types";

const rule: GradingRule = {
  ...(DEFAULT_GRADING_RULE as unknown as Omit<GradingRule, "id" | "schoolId" | "createdAt" | "updatedAt">),
  id: "grade-default",
  schoolId: "tazdeed-school",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function mark(partial: Partial<MarkInput> & { subjectId: string }): MarkInput {
  return {
    maximumMarks: 100,
    passMarks: 33,
    obtainedMarks: 80,
    status: "entered",
    ...partial,
  };
}

describe("grading rule validation", () => {
  it("accepts a well ordered scale", () => {
    expect(validateGradingRule(rule)).toEqual([]);
  });

  it("rejects unordered bands, duplicates and out-of-range percentages", () => {
    expect(
      validateGradingRule({
        bands: [
          { grade: "A", point: 4, minPercent: 50 },
          { grade: "A", point: 3, minPercent: 70 },
          { grade: "B", point: 5, minPercent: 120 },
        ],
        failGrade: "F",
        decimals: 2,
      }),
    ).toEqual([
      'Duplicate grade "A".',
      'Grade bands must be ordered from the highest minimum percentage down ("A").',
      'Grade "B" needs a minimum percentage between 0 and 100.',
      'Grade bands must be ordered from the highest minimum percentage down ("B").',
      'Grade points must not increase as the minimum percentage decreases ("B").',
    ]);
  });

  it("rejects an empty scale and bad decimal precision", () => {
    expect(validateGradingRule({ bands: [], failGrade: "F", decimals: 2 })).toContain(
      "At least one grade band is required.",
    );
    expect(validateGradingRule({ bands: rule.bands, failGrade: "F", decimals: 9 })).toContain(
      "Decimals must be between 0 and 4.",
    );
  });
});

describe("band resolution and rounding", () => {
  it("maps percentages onto the configured bands", () => {
    expect(resolveBand(95, rule)?.grade).toBe("A+");
    expect(resolveBand(80, rule)?.grade).toBe("A+");
    expect(resolveBand(79.9, rule)?.grade).toBe("A");
    expect(resolveBand(33, rule)?.grade).toBe("D");
    expect(resolveBand(10, rule)).toBeNull();
  });

  it("honours the configured rounding mode and decimals", () => {
    expect(roundValue(66.666, { rounding: "half-up", decimals: 2 })).toBe(66.67);
    expect(roundValue(66.666, { rounding: "floor", decimals: 2 })).toBe(66.66);
    expect(roundValue(66.666, { rounding: "half-up", decimals: 0 })).toBe(67);
    expect(roundValue(66.4, { rounding: "half-up", decimals: 0 })).toBe(66);
  });
});

describe("subject results", () => {
  it("marks an absent student as failed when the rule says so", () => {
    const subject = computeSubjectResult(mark({ subjectId: "s1", status: "absent", obtainedMarks: null }), rule);
    expect(subject.status).toBe("absent");
    expect(subject.grade).toBe("F");
    expect(subject.point).toBe(0);
    expect(subject.counted).toBe(true);
  });

  it("never invents a mark for missing data", () => {
    const subject = computeSubjectResult(mark({ subjectId: "s1", status: "pending", obtainedMarks: null }), rule);
    expect(subject.status).toBe("missing");
    expect(subject.obtainedMarks).toBeNull();
    expect(subject.percent).toBeNull();
    expect(subject.counted).toBe(false);
  });

  it("treats a below-pass score as failed", () => {
    const subject = computeSubjectResult(mark({ subjectId: "s1", obtainedMarks: 20 }), rule);
    expect(subject.status).toBe("failed");
    expect(subject.grade).toBe("F");
    expect(subject.counted).toBe(true);
  });

  it("drops a failed optional subject from the GPA when configured", () => {
    const dropped = computeSubjectResult(
      mark({ subjectId: "opt", obtainedMarks: 20, isOptional: true }),
      rule,
    );
    expect(dropped.status).toBe("excluded-optional");
    expect(dropped.counted).toBe(false);

    const kept = computeSubjectResult(mark({ subjectId: "opt", obtainedMarks: 20, isOptional: true }), {
      ...rule,
      dropFailedOptional: false,
    });
    expect(kept.status).toBe("failed");
    expect(kept.counted).toBe(true);
  });

  it("clamps obtained marks into the 0..maximum range", () => {
    expect(computeSubjectResult(mark({ subjectId: "s", obtainedMarks: 140 }), rule).obtainedMarks).toBe(100);
    expect(computeSubjectResult(mark({ subjectId: "s", obtainedMarks: -5 }), rule).obtainedMarks).toBe(0);
  });
});

describe("result computation", () => {
  it("computes totals, percentage, GPA and grade", () => {
    const result = computeResult({
      marks: [
        mark({ subjectId: "ban", obtainedMarks: 82 }),
        mark({ subjectId: "eng", obtainedMarks: 74 }),
        mark({ subjectId: "mat", obtainedMarks: 91 }),
      ],
      rule,
    });
    expect(result.totalMarks).toBe(247);
    expect(result.totalMaximum).toBe(300);
    expect(result.percentage).toBe(82.33);
    expect(result.grade).toBe("A+");
    // A+ (5) + A (4) + A+ (5) averaged over three unweighted subjects.
    expect(result.gpa).toBe(4.67);
    expect(result.status).toBe("passed");
    expect(result.failedSubjects).toBe(0);
    expect(result.computable).toBe(true);
  });

  it("fails the whole result when one required subject fails", () => {
    const result = computeResult({
      marks: [mark({ subjectId: "ban", obtainedMarks: 90 }), mark({ subjectId: "mat", obtainedMarks: 10 })],
      rule,
    });
    expect(result.status).toBe("failed");
    expect(result.grade).toBe("F");
    expect(result.gpa).toBe(0);
    expect(result.failedSubjects).toBe(1);
  });

  it("ignores a failed optional subject but keeps the pass", () => {
    const result = computeResult({
      marks: [
        mark({ subjectId: "ban", obtainedMarks: 90 }),
        mark({ subjectId: "hmath", obtainedMarks: 10, isOptional: true }),
      ],
      rule,
    });
    expect(result.status).toBe("passed");
    expect(result.failedSubjects).toBe(0);
    expect(result.totalMaximum).toBe(100);
    expect(result.gpa).toBe(5);
  });

  it("weights the GPA by credit hours", () => {
    const result = computeResult({
      marks: [
        mark({ subjectId: "a", obtainedMarks: 100, creditHours: 4 }), // point 5
        mark({ subjectId: "b", obtainedMarks: 60, creditHours: 1 }), // point 3.5
      ],
      rule,
    });
    expect(result.gpa).toBe(4.7);
  });

  it("reports incomplete when no marks are usable", () => {
    const result = computeResult({ marks: [mark({ subjectId: "a", obtainedMarks: null, status: "pending" })], rule });
    expect(result.computable).toBe(false);
    expect(result.status).toBe("incomplete");
    expect(result.missingSubjects).toBe(1);
  });

  it("supports a completely different scale per exam", () => {
    const fourPoint: GradingRule = {
      ...rule,
      bands: [
        { grade: "A", point: 4, minPercent: 90 },
        { grade: "B", point: 3, minPercent: 80 },
        { grade: "C", point: 2, minPercent: 70 },
        { grade: "D", point: 1, minPercent: 60 },
      ],
    };
    const result = computeResult({ marks: [mark({ subjectId: "a", obtainedMarks: 85 })], rule: fourPoint });
    expect(result.grade).toBe("B");
    expect(result.gpa).toBe(3);
  });
});

describe("merit positions", () => {
  it("ranks by GPA then totals and shares ranks for ties", () => {
    const positions = computeMeritPositions([
      { studentId: "a", gpa: 4, totalMarks: 300, status: "passed" },
      { studentId: "b", gpa: 5, totalMarks: 320, status: "passed" },
      { studentId: "c", gpa: 5, totalMarks: 320, status: "passed" },
      { studentId: "d", gpa: 3, totalMarks: 250, status: "failed" },
      { studentId: "e", gpa: 5, totalMarks: 310, status: "passed" },
    ]);
    expect(positions.get("b")).toBe(1);
    expect(positions.get("c")).toBe(1);
    expect(positions.get("e")).toBe(3);
    expect(positions.get("a")).toBe(4);
    expect(positions.get("d")).toBe(5); // failed students rank last
  });
});
