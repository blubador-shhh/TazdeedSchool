import { bulkCreateDocs, listDocs } from "@/lib/data/store";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { computeMeritPositions, computeResult } from "@/lib/academics/grading";
import { DEFAULT_GRADING_RULE } from "@/lib/academics/grading";
import type { Exam, GradingRule, Mark, Mark as MarkDoc, Result, Subject, SubjectResult } from "@/types";
import type { MarkInput } from "@/lib/academics/grading";

/**
 * Result generation.
 *
 * Reads the marks of one exam, applies the exam's configured grading rule and
 * writes draft `results` documents (publishing is a separate, audited step).
 * Missing marks are never invented: a student whose marks are incomplete is
 * marked `incomplete` and is not published.
 */

export interface GenerateResultSummary {
  computed: number;
  incomplete: number;
  published: number;
  ruleName: string;
}

export async function generateResultsForExam(examId: string, actorUid: string): Promise<GenerateResultSummary> {
  const [examRes, marksRes, subjectsRes, rulesRes] = await Promise.all([
    listDocs<Exam>("exams", { where: [["id", "==", examId]], limit: 1 }),
    listDocs<MarkDoc>("marks", { where: [["examId", "==", examId]], limit: 500 }),
    listDocs<Subject>("subjects", { limit: 200 }),
    listDocs<GradingRule>("gradingRules", { limit: 20 }),
  ]);

  const exam = examRes.rows[0];
  if (!exam) throw new Error("Exam not found.");
  const rule = rulesRes.rows.find((item) => item.id === exam.gradingRuleId) ?? {
    ...(DEFAULT_GRADING_RULE as unknown as GradingRule),
    id: "default",
    schoolId: SCHOOL_ID,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const subjectById = new Map(subjectsRes.rows.map((subject) => [subject.id, subject]));
  const byStudent = new Map<string, MarkDoc[]>();
  marksRes.rows.forEach((mark) => {
    const list = byStudent.get(mark.studentId) ?? [];
    list.push(mark);
    byStudent.set(mark.studentId, list);
  });

  const computations: { studentId: string; result: Result }[] = [];
  let incomplete = 0;

  for (const [studentId, marks] of byStudent) {
    const inputs: MarkInput[] = marks.map((mark) => {
      const subject = subjectById.get(mark.subjectId);
      return {
        subjectId: mark.subjectId,
        subjectName: subject ? subject.nameBn || subject.name : mark.subjectId,
        maximumMarks: mark.maximumMarks,
        passMarks: mark.passMarks,
        obtainedMarks: mark.obtainedMarks,
        status: mark.status,
        isOptional: Boolean(subject?.isOptional),
        creditHours: subject?.creditHours,
      };
    });

    const computed = computeResult({ marks: inputs, rule });
    if (!computed.computable) {
      incomplete += 1;
      continue;
    }

    computations.push({
      studentId,
      result: {
        id: `res-${examId}-${studentId}`,
        schoolId: SCHOOL_ID,
        examId,
        studentId,
        totalMarks: computed.totalMarks,
        totalMaximum: computed.totalMaximum,
        percentage: computed.percentage,
        grade: computed.grade,
        gpa: computed.gpa,
        subjects: computed.subjects as SubjectResult[],
        failedSubjects: computed.failedSubjects,
        status: computed.status === "failed" ? "failed" : "passed",
        meritPosition: null,
        publicationStatus: "draft",
        approvedBy: actorUid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }

  const positions = computeMeritPositions(computations.map((item) => item.result));
  const rows = computations.map((item) => ({
    ...item.result,
    meritPosition: positions.get(item.studentId) ?? null,
  }));

  let written = 0;
  for (let i = 0; i < rows.length; i += 50) {
    written += await bulkCreateDocs<Result>("results", rows.slice(i, i + 50));
  }

  return { computed: written, incomplete, published: 0, ruleName: rule.name };
}

export type { Mark };
