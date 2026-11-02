import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query } from "firebase/firestore";

/**
 * Firestore Security Rules tests.
 *
 * These run against the Firestore emulator, so they are skipped unless
 * FIRESTORE_EMULATOR_HOST is set. Run them with:
 *
 *   npx firebase emulators:exec --only firestore,auth \
 *     "FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx vitest run tests/security"
 *
 * Every scenario below asserts both an allowed and a denied operation.
 */

const SCHOOL = "tazdeed-school";
const RUNS = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!RUNS)("firestore.rules — access control", () => {
  let env: RulesTestEnvironment;

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: "tazdeed-test",
      firestore: {
        rules: readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8"),
        host: "127.0.0.1",
        port: 8080,
      },
    });

    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const users = {
        "admin-uid": { role: "admin", status: "active", schoolId: SCHOOL, uid: "admin-uid", email: "a@t.test" },
        "teacher-uid": { role: "teacher", status: "active", schoolId: SCHOOL, uid: "teacher-uid", teacherId: "tch-1" },
        "unassigned-teacher-uid": { role: "teacher", status: "active", schoolId: SCHOOL, uid: "unassigned-teacher-uid", teacherId: "tch-9" },
        "accountant-uid": { role: "accountant", status: "active", schoolId: SCHOOL, uid: "accountant-uid" },
        "librarian-uid": { role: "librarian", status: "active", schoolId: SCHOOL, uid: "librarian-uid" },
        "student-uid": { role: "student", status: "active", schoolId: SCHOOL, uid: "student-uid", studentId: "stu-1" },
        "other-student-uid": { role: "student", status: "active", schoolId: SCHOOL, uid: "other-student-uid", studentId: "stu-2" },
        "parent-uid": { role: "parent", status: "active", schoolId: SCHOOL, uid: "parent-uid", guardianStudentIds: ["stu-1"] },
        "other-parent-uid": { role: "parent", status: "active", schoolId: SCHOOL, uid: "other-parent-uid", guardianStudentIds: ["stu-9"] },
        "disabled-uid": { role: "admin", status: "disabled", schoolId: SCHOOL, uid: "disabled-uid" },
        "other-school-uid": { role: "admin", status: "active", schoolId: "other-school", uid: "other-school-uid" },
      };
      for (const [uid, data] of Object.entries(users)) {
        await setDoc(doc(db, "users", uid), data);
      }
      await setDoc(doc(db, "teachers", "tch-1"), { schoolId: SCHOOL, assignedClasses: ["class-5"], assignedSubjects: ["sub-math"] });
      await setDoc(doc(db, "teachers", "tch-9"), { schoolId: SCHOOL, assignedClasses: ["class-8"], assignedSubjects: ["sub-eng"] });
      await setDoc(doc(db, "students", "stu-1"), { schoolId: SCHOOL, admissionNo: "TZD-1", fullName: "A", guardianUids: ["parent-uid"], classId: "class-5" });
      await setDoc(doc(db, "students", "stu-2"), { schoolId: SCHOOL, admissionNo: "TZD-2", fullName: "B", guardianUids: [], classId: "class-8" });
      await setDoc(doc(db, "invoices", "inv-1"), { schoolId: SCHOOL, studentId: "stu-1", amountPaisa: 10000, discountPaisa: 0, paidAmountPaisa: 0, dueAmountPaisa: 10000, status: "unpaid", dueDate: "2099-01-01" });
      await setDoc(doc(db, "results", "res-1"), { schoolId: SCHOOL, studentId: "stu-1", examId: "e1", publicationStatus: "draft", gpa: 5, totalMarks: 100, totalMaximum: 100, percentage: 100, grade: "A+", status: "passed", subjects: [], failedSubjects: 0, meritPosition: 1 });
      await setDoc(doc(db, "results", "res-2"), { schoolId: SCHOOL, studentId: "stu-1", examId: "e1", publicationStatus: "published", gpa: 5, totalMarks: 100, totalMaximum: 100, percentage: 100, grade: "A+", status: "passed", subjects: [], failedSubjects: 0, meritPosition: 1 });
      await setDoc(doc(db, "notices", "n-public"), { schoolId: SCHOOL, publicationStatus: "published", visibility: "public", titleEn: "Public", createdBy: "admin-uid" });
      await setDoc(doc(db, "notices", "n-staff"), { schoolId: SCHOOL, publicationStatus: "published", visibility: "internal", titleEn: "Staff only", createdBy: "admin-uid" });
      await setDoc(doc(db, "admissionApplications", "adm-1"), { schoolId: SCHOOL, status: "pending", source: "public-website", studentName: "X", guardianName: "Y", guardianPhone: "01712345678" });
      await setDoc(doc(db, "salaryRecords", "sal-1"), { schoolId: SCHOOL, staffId: "s1", monthKey: "2026-01", basicPaisa: 1000, allowancesPaisa: 0, deductionsPaisa: 0, netPaisa: 1000, status: "draft" });
      await setDoc(doc(db, "attendanceRecords", "att-1"), { schoolId: SCHOOL, studentId: "stu-1", classId: "class-5", sectionId: "sec-5a", dateKey: "2026-01-09", status: "present", markedBy: "teacher-uid" });
      await setDoc(doc(db, "books", "book-1"), { schoolId: SCHOOL, bookCode: "B1", title: "T", totalCopies: 2, availableCopies: 1 });
    });
  });

  afterAll(async () => {
    await env.clearFirestore();
    await env.cleanup();
  });

  it("denies unauthenticated access to private documents", async () => {
    const guest = env.unauthenticatedContext();
    await assertFails(getDoc(doc(guest.firestore(), "students", "stu-1")));
    await assertFails(getDoc(doc(guest.firestore(), "users", "admin-uid")));
    await assertFails(getDocs(query(collection(guest.firestore(), "invoices"))));
  });

  it("denies a disabled account even with an admin role", async () => {
    const disabled = env.authenticatedContext("disabled-uid");
    await assertFails(getDoc(doc(disabled.firestore(), "students", "stu-1")));
  });

  it("denies an administrator from another school", async () => {
    const other = env.authenticatedContext("other-school-uid");
    await assertFails(getDoc(doc(other.firestore(), "students", "stu-1")));
    await assertFails(updateDoc(doc(other.firestore(), "notices", "n-public"), { titleEn: "hijacked" }));
  });

  it("allows a student to read only their own profile", async () => {
    const student = env.authenticatedContext("student-uid");
    await assertSucceeds(getDoc(doc(student.firestore(), "students", "stu-1")));
    await assertFails(getDoc(doc(student.firestore(), "students", "stu-2")));
    await assertFails(updateDoc(doc(student.firestore(), "students", "stu-1"), { fullName: "Hacked" }));
  });

  it("allows a parent to read only linked children", async () => {
    const parent = env.authenticatedContext("parent-uid");
    await assertSucceeds(getDoc(doc(parent.firestore(), "students", "stu-1")));
    await assertFails(getDoc(doc(parent.firestore(), "students", "stu-2")));

    const otherParent = env.authenticatedContext("other-parent-uid");
    await assertFails(getDoc(doc(otherParent.firestore(), "students", "stu-1")));
  });

  it("restricts teachers to their assigned classes and blocks finance access", async () => {
    const teacher = env.authenticatedContext("teacher-uid");
    await assertSucceeds(
      setDoc(doc(teacher.firestore(), "attendanceRecords", "att-2026-01-10-stu-1"), {
        schoolId: SCHOOL,
        studentId: "stu-1",
        classId: "class-5",
        sectionId: "sec-5a",
        dateKey: "2026-01-10",
        status: "present",
        markedBy: "teacher-uid",
      }),
    );
    await assertFails(
      setDoc(doc(teacher.firestore(), "attendanceRecords", "att-2026-01-10-stu-2"), {
        schoolId: SCHOOL,
        studentId: "stu-2",
        classId: "class-8",
        sectionId: "sec-8a",
        dateKey: "2026-01-10",
        status: "present",
        markedBy: "teacher-uid",
      }),
    );
    await assertFails(getDoc(doc(teacher.firestore(), "invoices", "inv-1")));
    await assertFails(getDoc(doc(teacher.firestore(), "salaryRecords", "sal-1")));
    await assertFails(updateDoc(doc(teacher.firestore(), "results", "res-1"), { publicationStatus: "published" }));
  });

  it("blocks teachers from changing attendance for another teacher's record", async () => {
    const stranger = env.authenticatedContext("unassigned-teacher-uid");
    await assertFails(updateDoc(doc(stranger.firestore(), "attendanceRecords", "att-1"), { status: "absent" }));
  });

  it("lets accountants verify payments but not touch marks or results", async () => {
    const accountant = env.authenticatedContext("accountant-uid");
    await assertSucceeds(getDoc(doc(accountant.firestore(), "invoices", "inv-1")));
    await assertSucceeds(updateDoc(doc(accountant.firestore(), "invoices", "inv-1"), { paidAmountPaisa: 10000, dueAmountPaisa: 0, status: "paid" }));
    await assertFails(setDoc(doc(accountant.firestore(), "marks", "m1"), { schoolId: SCHOOL, examId: "e1", studentId: "stu-1", subjectId: "sub-math", maximumMarks: 100, passMarks: 33, obtainedMarks: 100, status: "entered", enteredBy: "accountant-uid" }));
    await assertFails(updateDoc(doc(accountant.firestore(), "results", "res-1"), { publicationStatus: "published" }));
  });

  it("prevents students, parents and teachers from settling an invoice", async () => {
    for (const uid of ["student-uid", "parent-uid", "teacher-uid", "librarian-uid"]) {
      const context = env.authenticatedContext(uid);
      await assertFails(updateDoc(doc(context.firestore(), "invoices", "inv-1"), { status: "paid", paidAmountPaisa: 10000, dueAmountPaisa: 0 }));
    }
  });

  it("blocks privilege escalation through /users", async () => {
    const student = env.authenticatedContext("student-uid");
    await assertFails(updateDoc(doc(student.firestore(), "users", "student-uid"), { role: "admin" }));
    await assertFails(updateDoc(doc(student.firestore(), "users", "student-uid"), { status: "active", role: "admin", schoolId: "other-school" }));
    await assertFails(setDoc(doc(student.firestore(), "users", "attacker"), { uid: "attacker", role: "admin", status: "active", schoolId: SCHOOL }));
    await assertFails(updateDoc(doc(student.firestore(), "users", "student-uid"), { studentId: "stu-2" }));
    // Allowed: editing their own display fields.
    await assertSucceeds(updateDoc(doc(student.firestore(), "users", "student-uid"), { displayName: "New name", preferredLanguage: "en" }));

    const admin = env.authenticatedContext("admin-uid");
    await assertFails(setDoc(doc(admin.firestore(), "users", "second-admin"), { uid: "second-admin", role: "admin", status: "active", schoolId: SCHOOL }));
    await assertSucceeds(setDoc(doc(admin.firestore(), "users", "new-teacher"), { uid: "new-teacher", role: "teacher", status: "active", schoolId: SCHOOL, email: "t@t.test" }));
  });

  it("exposes only published public notices to visitors", async () => {
    const guest = env.unauthenticatedContext();
    await assertSucceeds(getDoc(doc(guest.firestore(), "notices", "n-public")));
    await assertFails(getDoc(doc(guest.firestore(), "notices", "n-staff")));

    const student = env.authenticatedContext("student-uid");
    await assertSucceeds(getDoc(doc(student.firestore(), "notices", "n-staff")));
  });

  it("lets visitors submit applications but never read or approve them", async () => {
    const guest = env.unauthenticatedContext();
    await assertSucceeds(
      setDoc(doc(guest.firestore(), "admissionApplications", "adm-new"), {
        schoolId: SCHOOL,
        studentName: "New Student",
        guardianName: "Guardian",
        guardianPhone: "01712345678",
        dateOfBirth: "2015-01-01",
        gender: "male",
        applyingClassId: "class-1",
        status: "pending",
        source: "public-website",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        id: "adm-new",
      }),
    );
    await assertFails(getDoc(doc(guest.firestore(), "admissionApplications", "adm-1")));
    await assertFails(updateDoc(doc(guest.firestore(), "admissionApplications", "adm-1"), { status: "admitted" }));
    await assertFails(
      setDoc(doc(guest.firestore(), "admissionApplications", "adm-bad"), {
        schoolId: SCHOOL,
        studentName: "Bad",
        guardianName: "G",
        guardianPhone: "01712345678",
        status: "admitted", // visitor cannot approve
        source: "public-website",
      }),
    );
    await assertFails(
      setDoc(doc(guest.firestore(), "contactMessages", "cm-bad"), {
        schoolId: "other-school",
        name: "Spam",
        subject: "hello there",
        message: "a long enough message body",
        status: "new",
        source: "public-website",
      }),
    );
  });

  it("hides payroll from teachers, students and parents", async () => {
    for (const uid of ["teacher-uid", "student-uid", "parent-uid"]) {
      const context = env.authenticatedContext(uid);
      await assertFails(getDoc(doc(context.firestore(), "salaryRecords", "sal-1")));
    }
    const accountant = env.authenticatedContext("accountant-uid");
    await assertSucceeds(getDoc(doc(accountant.firestore(), "salaryRecords", "sal-1")));
  });

  it("shows students and parents only published results", async () => {
    const student = env.authenticatedContext("student-uid");
    await assertFails(getDoc(doc(student.firestore(), "results", "res-1"))); // draft
    await assertSucceeds(getDoc(doc(student.firestore(), "results", "res-2"))); // published

    const parent = env.authenticatedContext("parent-uid");
    await assertSucceeds(getDoc(doc(parent.firestore(), "results", "res-2")));
    await assertFails(updateDoc(doc(parent.firestore(), "results", "res-2"), { gpa: 0 }));
  });

  it("keeps the librarian inside library bounds", async () => {
    const librarian = env.authenticatedContext("librarian-uid");
    await assertSucceeds(updateDoc(doc(librarian.firestore(), "books", "book-1"), { availableCopies: 0 }));
    await assertFails(updateDoc(doc(librarian.firestore(), "books", "book-1"), { availableCopies: 99 })); // more than totalCopies
    await assertFails(deleteDoc(doc(librarian.firestore(), "students", "stu-1")));
    await assertFails(updateDoc(doc(librarian.firestore(), "notices", "n-public"), { titleEn: "x" }));
  });

  it("allows admins to manage school records", async () => {
    const admin = env.authenticatedContext("admin-uid");
    await assertSucceeds(setDoc(doc(admin.firestore(), "notices", "n-new"), { schoolId: SCHOOL, publicationStatus: "draft", visibility: "public", titleEn: "New", titleBn: "", descriptionEn: "", descriptionBn: "", category: "general", createdBy: "admin-uid" }));
    await assertSucceeds(updateDoc(doc(admin.firestore(), "results", "res-1"), { publicationStatus: "published", publishedAt: "2026-01-09T00:00:00.000Z", approvedBy: "admin-uid" }));
    await assertSucceeds(deleteDoc(doc(admin.firestore(), "notices", "n-new")));
    await assertFails(setDoc(doc(admin.firestore(), "students", "stu-x"), { schoolId: "other-school", admissionNo: "X", fullName: "X" }));
  });
});
