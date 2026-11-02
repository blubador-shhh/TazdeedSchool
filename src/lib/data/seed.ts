import { localDriver, localDbIsEmpty } from "@/lib/data/store";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { DEFAULT_GRADING_RULE } from "@/lib/academics/grading";
import { addDays, todayKey } from "@/lib/utils/date";
import type { CollectionName } from "@/types";

/**
 * DEVELOPMENT FIXTURES — clearly labelled, never production data.
 *
 * These rows are written **only** into the browser-local fallback driver when
 * no Firebase project is configured, so a reviewer can exercise the ERP end to
 * end. Nothing here is ever pushed into Cloud Firestore, and every fixture
 * carries `isDemoFixture: true`.
 */

const stamp = "2026-01-01T00:00:00.000Z";

const base = { schoolId: SCHOOL_ID, createdAt: stamp, updatedAt: stamp, isDemoFixture: true };

const CLASSES = [
  { id: "class-1", name: "Class 1", nameBn: "প্রথম শ্রেণি", numericLevel: 1 },
  { id: "class-2", name: "Class 2", nameBn: "দ্বিতীয় শ্রেণি", numericLevel: 2 },
  { id: "class-3", name: "Class 3", nameBn: "তৃতীয় শ্রেণি", numericLevel: 3 },
  { id: "class-5", name: "Class 5", nameBn: "পঞ্চম শ্রেণি", numericLevel: 5 },
  { id: "class-8", name: "Class 8", nameBn: "অষ্টম শ্রেণি", numericLevel: 8 },
  { id: "class-10", name: "Class 10", nameBn: "দশম শ্রেণি", numericLevel: 10 },
];

const SECTIONS = [
  { id: "sec-1a", classId: "class-1", name: "A", capacity: 40 },
  { id: "sec-5a", classId: "class-5", name: "A", capacity: 45 },
  { id: "sec-5b", classId: "class-5", name: "B", capacity: 45 },
  { id: "sec-8a", classId: "class-8", name: "A", capacity: 50 },
  { id: "sec-10a", classId: "class-10", name: "A", capacity: 50 },
];

const SUBJECTS = [
  { id: "sub-bangla", code: "BAN", name: "Bangla", nameBn: "বাংলা", classIds: CLASSES.map((c) => c.id), creditHours: 4, isOptional: false },
  { id: "sub-english", code: "ENG", name: "English", nameBn: "ইংরেজি", classIds: CLASSES.map((c) => c.id), creditHours: 4, isOptional: false },
  { id: "sub-math", code: "MAT", name: "Mathematics", nameBn: "গণিত", classIds: CLASSES.map((c) => c.id), creditHours: 4, isOptional: false },
  { id: "sub-science", code: "SCI", name: "Science", nameBn: "বিজ্ঞান", classIds: ["class-5", "class-8", "class-10"], creditHours: 3, isOptional: false },
  { id: "sub-ict", code: "ICT", name: "ICT", nameBn: "তথ্য ও যোগাযোগ প্রযুক্তি", classIds: ["class-8", "class-10"], creditHours: 2, isOptional: false },
  { id: "sub-higher-math", code: "HMA", name: "Higher Mathematics", nameBn: "উচ্চতর গণিত", classIds: ["class-10"], creditHours: 3, isOptional: true },
];

const TEACHERS = [
  { id: "tch-01", employeeId: "EMP-001", name: "Nusrat Jahan", nameBn: "নুসরাত জাহান", email: "teacher@tazdeed.school", designation: "Senior Teacher", assignedSubjects: ["sub-bangla", "sub-english"], assignedClasses: ["class-5", "class-8"] },
  { id: "tch-02", employeeId: "EMP-002", name: "Mahmudul Hasan", nameBn: "মাহমুদুল হাসান", email: "mahmudul@tazdeed.school", designation: "Assistant Teacher (Math)", assignedSubjects: ["sub-math", "sub-higher-math"], assignedClasses: ["class-8", "class-10"] },
  { id: "tch-03", employeeId: "EMP-003", name: "Sharmin Akter", nameBn: "শারমিন আক্তার", email: "sharmin@tazdeed.school", designation: "Assistant Teacher (Science)", assignedSubjects: ["sub-science", "sub-ict"], assignedClasses: ["class-5", "class-10"] },
];

const STUDENTS = [
  { id: "stu-0001", admissionNo: "TZD-2026-0001", rollNo: "01", fullName: "Ayesha Siddiqua", fullNameBn: "আয়েশা সিদ্দিকা", gender: "female", classId: "class-5", sectionId: "sec-5a", guardianName: "Kamrul Islam", guardianPhone: "01700000001", guardianUids: ["demo-parent"] },
  { id: "stu-0002", admissionNo: "TZD-2026-0002", rollNo: "02", fullName: "Rafiqul Islam", fullNameBn: "রফিকুল ইসলাম", gender: "male", classId: "class-5", sectionId: "sec-5a", guardianName: "Abdul Karim", guardianPhone: "01700000002", guardianUids: ["demo-parent"] },
  { id: "stu-0003", admissionNo: "TZD-2026-0003", rollNo: "03", fullName: "Sumaiya Akter", fullNameBn: "সুমাইয়া আক্তার", gender: "female", classId: "class-5", sectionId: "sec-5b", guardianName: "Jashim Uddin", guardianPhone: "01700000003", guardianUids: [] },
  { id: "stu-0004", admissionNo: "TZD-2026-0004", rollNo: "04", fullName: "Tanvir Ahmed", fullNameBn: "তানভীর আহমেদ", gender: "male", classId: "class-8", sectionId: "sec-8a", guardianName: "Shah Alam", guardianPhone: "01700000004", guardianUids: [] },
  { id: "stu-0005", admissionNo: "TZD-2026-0005", rollNo: "05", fullName: "Maliha Rahman", fullNameBn: "মালিহা রহমান", gender: "female", classId: "class-8", sectionId: "sec-8a", guardianName: "Mizanur Rahman", guardianPhone: "01700000005", guardianUids: [] },
  { id: "stu-0006", admissionNo: "TZD-2026-0006", rollNo: "06", fullName: "Sabbir Hossain", fullNameBn: "সাব্বির হোসেন", gender: "male", classId: "class-10", sectionId: "sec-10a", guardianName: "Anwar Hossain", guardianPhone: "01700000006", guardianUids: ["demo-student-uid"] },
  { id: "stu-0007", admissionNo: "TZD-2026-0007", rollNo: "07", fullName: "Nabila Haque", fullNameBn: "নাবিলা হক", gender: "female", classId: "class-10", sectionId: "sec-10a", guardianName: "Abul Haque", guardianPhone: "01700000007", guardianUids: [] },
  { id: "stu-0008", admissionNo: "TZD-2026-0008", rollNo: "01", fullName: "Imran Kabir", fullNameBn: "ইমরান কবির", gender: "male", classId: "class-1", sectionId: "sec-1a", guardianName: "Kabir Ahmed", guardianPhone: "01700000008", guardianUids: [] },
];

export interface DemoUser {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  displayNameBn: string;
  role: "admin" | "teacher" | "accountant" | "librarian" | "student" | "parent";
  teacherId?: string;
  studentId?: string;
  guardianStudentIds?: string[];
}

export const DEMO_USERS: DemoUser[] = [
  { uid: "demo-admin", email: "admin@tazdeed.school", password: "Admin@123", displayName: "School Administrator", displayNameBn: "স্কুল প্রশাসক", role: "admin" },
  { uid: "demo-teacher", email: "teacher@tazdeed.school", password: "Teacher@123", displayName: "Nusrat Jahan", displayNameBn: "নুসরাত জাহান", role: "teacher", teacherId: "tch-01" },
  { uid: "demo-accountant", email: "accountant@tazdeed.school", password: "Accounts@123", displayName: "Rafiqul Amin", displayNameBn: "রফিকুল আমিন", role: "accountant" },
  { uid: "demo-librarian", email: "librarian@tazdeed.school", password: "Library@123", displayName: "Shirin Sultana", displayNameBn: "শিরিন সুলতানা", role: "librarian" },
  { uid: "demo-student-uid", email: "student@tazdeed.school", password: "Student@123", displayName: "Sabbir Hossain", displayNameBn: "সাব্বির হোসেন", role: "student", studentId: "stu-0006" },
  { uid: "demo-parent", email: "parent@tazdeed.school", password: "Parent@123", displayName: "Kamrul Islam", displayNameBn: "কামরুল ইসলাম", role: "parent", guardianStudentIds: ["stu-0001", "stu-0002"] },
] as const;

const today = todayKey();

const EMPTY_COLLECTIONS: CollectionName[] = [
  "schools", "guardians", "notifications", "auditLogs", "counters",
  "homeworkSubmissions", "salaryRecords", "contactMessages",
];

const emptyEntries: [CollectionName, Record<string, unknown>[]][] = EMPTY_COLLECTIONS.map(
  (name): [CollectionName, Record<string, unknown>[]] => [name, []],
);

export const SEED: Partial<Record<CollectionName, Record<string, unknown>[]>> = {
  ...Object.fromEntries(emptyEntries),
  schoolSettings: [
    {
      ...base,
      id: SCHOOL_ID,
      nameEn: "Tazdeed School",
      nameBn: "তাজদীদ স্কুল",
      taglineEn: "Smart Education • Brighter Future",
      taglineBn: "প্রযুক্তিনির্ভর আধুনিক শিক্ষা, সুন্দর ভবিষ্যতের পথে",
      logoUrl: "/images/tazdeed-school-logo.png",
      addressEn: "[Add the official school address in Settings]",
      addressBn: "[সেটিংস থেকে স্কুলের প্রকৃত ঠিকানা যুক্ত করুন]",
      phone: "",
      email: "",
      openingHours: "",
      mapUrl: "",
      facebookUrl: "",
      youtubeUrl: "",
      currency: "BDT",
      currencyLocale: "bn-BD",
      timezone: "Asia/Dhaka",
      currentSessionId: "session-2026",
    },
  ],
  publicSiteContent: [
    {
      ...base,
      id: "home",
      heroTitleBn: "প্রযুক্তিনির্ভর আধুনিক শিক্ষা, সুন্দর ভবিষ্যতের পথে",
      heroTitleEn: "Smart Education, A Brighter Future",
      heroSubtitleBn:
        "যত্নশীল শিক্ষক, সুশৃঙ্খল একাডেমিক পরিকল্পনা এবং ডিজিটাল স্কুল ম্যানেজমেন্ট সিস্টেম — প্রতিটি শিক্ষার্থীর অগ্রগতি এখন স্বচ্ছভাবে দেখা যায়।",
      heroSubtitleEn:
        "A caring teaching team, a structured academic plan and a digital school management system — so every student's progress is visible.",
      heroImageUrl: "/images/hero/hero-classroom.jpg",
      aboutTitleBn: "তাজদীদ স্কুল সম্পর্কে",
      aboutTitleEn: "About Tazdeed School",
      aboutBodyBn:
        "[স্কুল সম্পর্কে প্রকৃত বিবরণ সেটিংস থেকে যুক্ত করুন।] তাজদীদ স্কুল শিক্ষার্থীর নৈতিক, একাডেমিক ও সামাজিক বিকাশকে একসাথে এগিয়ে নিতে কাজ করে।",
      aboutBodyEn:
        "[Add the real school description in Settings.] Tazdeed School works on the moral, academic and social development of every student together.",
      visionBn: "[দৃষ্টিভঙ্গি সেটিংসে যুক্ত করুন]",
      visionEn: "[Add the vision statement in Settings]",
      missionBn: "[মিশন সেটিংসে যুক্ত করুন]",
      missionEn: "[Add the mission statement in Settings]",
      aboutImageUrl: "/images/school/about-classroom.jpg",
      showStats: true,
      stats: [
        { id: "students", labelBn: "শিক্ষার্থী", labelEn: "Students", value: "", show: true },
        { id: "teachers", labelBn: "শিক্ষক", labelEn: "Teachers", value: "", show: true },
        { id: "classes", labelBn: "শ্রেণি", labelEn: "Classes", value: "", show: true },
        { id: "established", labelBn: "প্রতিষ্ঠা", labelEn: "Established", value: "", show: true },
      ],
      features: [
        { id: "quality", icon: "graduation-cap", titleBn: "মানসম্মত শিক্ষা", titleEn: "Quality Education", bodyBn: "জাতীয় পাঠ্যক্রম অনুসরণ করে সুশৃঙ্খল একাডেমিক পরিকল্পনা।", bodyEn: "A disciplined academic plan that follows the national curriculum.", show: true },
        { id: "smart", icon: "monitor", titleBn: "স্মার্ট শ্রেণিকক্ষ", titleEn: "Smart Classroom", bodyBn: "মাল্টিমিডিয়া ও ডিজিটাল কনটেন্ট ব্যবহার করে পাঠদান।", bodyEn: "Multimedia and digital content supported lessons.", show: true },
        { id: "teachers", icon: "users", titleBn: "অভিজ্ঞ শিক্ষক", titleEn: "Experienced Teachers", bodyBn: "বিষয়ভিত্তিক প্রশিক্ষণপ্রাপ্ত শিক্ষকমণ্ডলী।", bodyEn: "Subject-trained and experienced teaching staff.", show: true },
        { id: "safe", icon: "shield-check", titleBn: "নিরাপদ পরিবেশ", titleEn: "Safe & Friendly Environment", bodyBn: "সিসিটিভি নিরাপত্তা ও শিক্ষার্থীবান্ধব পরিবেশ।", bodyEn: "CCTV monitoring and a student-friendly campus.", show: true },
        { id: "holistic", icon: "sparkles", titleBn: "সার্বিক বিকাশ", titleEn: "Holistic Development", bodyBn: "খেলাধুলা, সাংস্কৃতিক ও সহশিক্ষা কার্যক্রম।", bodyEn: "Sports, cultural and co-curricular activities.", show: true },
        { id: "future", icon: "rocket", titleBn: "ভবিষ্যৎ প্রস্তুতি", titleEn: "Future Ready Learning", bodyBn: "তথ্যপ্রযুক্তি ও দক্ষতা উন্নয়নমূলক কোর্স।", bodyEn: "ICT and skill development courses.", show: true },
      ],
      programs: [
        { id: "primary", titleBn: "প্রাথমিক শাখা", titleEn: "Primary", bodyBn: "১ম থেকে ৫ম শ্রেণি পর্যন্ত।", bodyEn: "Classes 1 to 5.", active: true },
        { id: "junior", titleBn: "জুনিয়র শাখা", titleEn: "Junior", bodyBn: "৬ষ্ঠ থেকে ৮ম শ্রেণি পর্যন্ত।", bodyEn: "Classes 6 to 8.", active: true },
        { id: "secondary", titleBn: "মাধ্যমিক শাখা", titleEn: "Secondary", bodyBn: "৯ম ও ১০ম শ্রেণি।", bodyEn: "Classes 9 and 10.", active: true },
        { id: "playgroup", titleBn: "প্লে গ্রুপ", titleEn: "Play Group", bodyBn: "প্রাক-প্রাথমিক শাখা (চালু নয়)।", bodyEn: "Pre-primary section (not active).", active: false },
      ],
      facilities: [
        { id: "library", icon: "library", titleBn: "লাইব্রেরি", titleEn: "Library", bodyBn: "পাঠ্য ও রেফারেন্স বইয়ের সংগ্রহ।", bodyEn: "Text and reference book collection.", show: true },
        { id: "lab", icon: "flask-conical", titleBn: "বিজ্ঞান ল্যাব", titleEn: "Science Lab", bodyBn: "হাতে-কলমে পরীক্ষার সুযোগ।", bodyEn: "Hands-on experiments.", show: true },
        { id: "ict", icon: "monitor", titleBn: "কম্পিউটার ল্যাব", titleEn: "Computer Lab", bodyBn: "তথ্যপ্রযুক্তি শিক্ষার জন্য ল্যাব।", bodyEn: "Dedicated ICT lab.", show: true },
        { id: "playground", icon: "trees", titleBn: "খেলার মাঠ", titleEn: "Playground", bodyBn: "খেলাধুলা ও সমাবেশের মাঠ।", bodyEn: "Field for sports and assemblies.", show: true },
        { id: "transport", icon: "bus", titleBn: "পরিবহন", titleEn: "Transport", bodyBn: "নির্ধারিত রুটে স্কুল বাস।", bodyEn: "School bus on fixed routes.", show: true },
        { id: "cctv", icon: "cctv", titleBn: "সিসিটিভি নিরাপত্তা", titleEn: "CCTV Security", bodyBn: "ক্যাম্পাস জুড়ে নজরদারি।", bodyEn: "Campus-wide monitoring.", show: true },
      ],
      showTestimonials: true,
    },
  ],
  academicSessions: [
    { ...base, id: "session-2026", name: "2026", startDate: "2026-01-01", endDate: "2026-12-31", isCurrent: true },
    { ...base, id: "session-2025", name: "2025", startDate: "2025-01-01", endDate: "2025-12-31", isCurrent: false },
  ],
  classes: CLASSES.map((c) => ({ ...base, ...c, isActive: true })),
  sections: SECTIONS.map((s) => ({ ...base, ...s, roomNo: "" })),
  subjects: SUBJECTS.map((s) => ({ ...base, ...s })),
  teachers: TEACHERS.map((t) => ({ ...base, ...t, status: "active", phone: "" })),
  staff: [
    { ...base, id: "staff-01", employeeId: "EMP-101", name: "Rafiqul Amin", nameBn: "রফিকুল আমিন", designation: "Accountant", department: "Administration", status: "active", monthlySalaryPaisa: 2500000 },
    { ...base, id: "staff-02", employeeId: "EMP-102", name: "Shirin Sultana", nameBn: "শিরিন সুলতানা", designation: "Librarian", department: "Library", status: "active", monthlySalaryPaisa: 2000000 },
  ],
  students: STUDENTS.map((s, index) => ({
    ...base,
    ...s,
    dateOfBirth: `201${3 + (index % 4)}-0${(index % 9) + 1}-1${index % 9}`,
    academicSessionId: "session-2026",
    enrollmentStatus: "active",
    address: "",
    photoUrl: "",
    guardianEmail: "",
  })),
  enrollments: STUDENTS.map((s) => ({
    ...base,
    id: `enr-${s.id}`,
    studentId: s.id,
    academicSessionId: "session-2026",
    classId: s.classId,
    sectionId: s.sectionId,
    rollNo: s.rollNo,
    status: "active",
  })),
  teacherAssignments: [
    { ...base, id: "ta-01", teacherId: "tch-01", classId: "class-5", sectionId: "sec-5a", subjectId: "sub-bangla", academicSessionId: "session-2026" },
    { ...base, id: "ta-02", teacherId: "tch-02", classId: "class-8", sectionId: "sec-8a", subjectId: "sub-math", academicSessionId: "session-2026" },
    { ...base, id: "ta-03", teacherId: "tch-03", classId: "class-10", sectionId: "sec-10a", subjectId: "sub-science", academicSessionId: "session-2026" },
  ],
  gradingRules: [{ ...base, id: "grade-default", ...DEFAULT_GRADING_RULE }],
  exams: [
    {
      ...base,
      id: "exam-2026-first",
      name: "First Term Examination 2026",
      nameBn: "প্রথম সাময়িক পরীক্ষা ২০২৬",
      category: "term",
      academicSessionId: "session-2026",
      classIds: ["class-5", "class-8", "class-10"],
      startDate: addDays(today, 14),
      endDate: addDays(today, 24),
      gradingRuleId: "grade-default",
      publicationStatus: "draft",
    },
  ],
  marks: [
    { ...base, id: "mk-1", examId: "exam-2026-first", studentId: "stu-0006", subjectId: "sub-bangla", maximumMarks: 100, passMarks: 33, obtainedMarks: 82, status: "entered", enteredBy: "demo-teacher" },
    { ...base, id: "mk-2", examId: "exam-2026-first", studentId: "stu-0006", subjectId: "sub-english", maximumMarks: 100, passMarks: 33, obtainedMarks: 74, status: "entered", enteredBy: "demo-teacher" },
    { ...base, id: "mk-3", examId: "exam-2026-first", studentId: "stu-0006", subjectId: "sub-math", maximumMarks: 100, passMarks: 33, obtainedMarks: 91, status: "entered", enteredBy: "demo-teacher" },
    { ...base, id: "mk-4", examId: "exam-2026-first", studentId: "stu-0006", subjectId: "sub-science", maximumMarks: 100, passMarks: 33, obtainedMarks: 68, status: "entered", enteredBy: "demo-teacher" },
  ],
  feeStructures: [
    { ...base, id: "fee-tuition", title: "Monthly Tuition Fee", titleBn: "মাসিক বেতন", feeType: "tuition", classIds: CLASSES.map((c) => c.id), academicSessionId: "session-2026", amountPaisa: 85000, frequency: "monthly", dueDayOfMonth: 10, isActive: true },
    { ...base, id: "fee-admission", title: "Admission Fee", titleBn: "ভর্তি ফি", feeType: "admission", classIds: CLASSES.map((c) => c.id), academicSessionId: "session-2026", amountPaisa: 500000, frequency: "once", isActive: true },
  ],
  invoices: [
    { ...base, id: "inv-0001", studentId: "stu-0001", feeStructureId: "fee-tuition", feeType: "tuition", academicSessionId: "session-2026", period: "2026-01", amountPaisa: 85000, discountPaisa: 0, paidAmountPaisa: 85000, dueAmountPaisa: 0, status: "paid", dueDate: "2026-01-10", receiptNo: "TZD/2026/000001" },
    { ...base, id: "inv-0002", studentId: "stu-0002", feeStructureId: "fee-tuition", feeType: "tuition", academicSessionId: "session-2026", period: "2026-01", amountPaisa: 85000, discountPaisa: 0, paidAmountPaisa: 30000, dueAmountPaisa: 55000, status: "partial", dueDate: "2026-01-10", receiptNo: "" },
    { ...base, id: "inv-0003", studentId: "stu-0004", feeStructureId: "fee-tuition", feeType: "tuition", academicSessionId: "session-2026", period: "2026-01", amountPaisa: 85000, discountPaisa: 0, paidAmountPaisa: 0, dueAmountPaisa: 85000, status: "unpaid", dueDate: addDays(today, 6), receiptNo: "" },
    { ...base, id: "inv-0004", studentId: "stu-0006", feeStructureId: "fee-admission", feeType: "admission", academicSessionId: "session-2026", period: "2026", amountPaisa: 500000, discountPaisa: 0, paidAmountPaisa: 0, dueAmountPaisa: 500000, status: "unpaid", dueDate: addDays(today, 20), receiptNo: "" },
  ],
  payments: [
    { ...base, id: "pay-0001", invoiceId: "inv-0001", studentId: "stu-0001", amountPaisa: 85000, method: "cash", verificationStatus: "verified", receivedBy: "demo-accountant", verifiedBy: "demo-accountant", verifiedAt: stamp },
    { ...base, id: "pay-0002", invoiceId: "inv-0002", studentId: "stu-0002", amountPaisa: 30000, method: "cash", verificationStatus: "verified", receivedBy: "demo-accountant", verifiedBy: "demo-accountant", verifiedAt: stamp },
    { ...base, id: "pay-0003", invoiceId: "inv-0003", studentId: "stu-0004", amountPaisa: 20000, method: "bkash", transactionReference: "DEMO8F3K21", verificationStatus: "unverified", receivedBy: "demo-accountant" },
  ],
  expenses: [
    { ...base, id: "exp-0001", title: "Classroom stationery", category: "supplies", amountPaisa: 1250000, expenseDate: addDays(today, -12), vendor: "Local stationer", recordedBy: "demo-accountant" },
    { ...base, id: "exp-0002", title: "Science lab maintenance", category: "maintenance", amountPaisa: 480000, expenseDate: addDays(today, -4), vendor: "Lab suppliers", recordedBy: "demo-accountant" },
  ],
  notices: [
    { ...base, id: "notice-01", titleBn: "প্রথম সাময়িক পরীক্ষার রুটিন প্রকাশ", titleEn: "First Term Examination Routine Published", descriptionBn: "প্রথম সাময়িক পরীক্ষার রুটিন প্রকাশ করা হয়েছে। অফিস থেকে সংগ্রহ করুন।", descriptionEn: "The first term examination routine has been published. Collect it from the office.", category: "exam", visibility: "public", publicationStatus: "published", publishedAt: addDays(today, -3), createdBy: "demo-admin" },
    { ...base, id: "notice-02", titleBn: "মাসিক বেতন পরিশোধের সময়সীমা", titleEn: "Monthly Fee Payment Deadline", descriptionBn: "প্রতি মাসের ১০ তারিখের মধ্যে বেতন পরিশোধ করতে হবে।", descriptionEn: "Monthly tuition must be paid by the 10th of each month.", category: "fees", visibility: "public", publicationStatus: "published", publishedAt: addDays(today, -9), createdBy: "demo-admin" },
    { ...base, id: "notice-03", titleBn: "শিক্ষক সভা", titleEn: "Staff Meeting", descriptionBn: "আগামী বৃহস্পতিবার শিক্ষক সভা অনুষ্ঠিত হবে।", descriptionEn: "A staff meeting will be held next Thursday.", category: "internal", visibility: "teachers", publicationStatus: "published", publishedAt: addDays(today, -1), createdBy: "demo-admin" },
  ],
  events: [
    { ...base, id: "event-01", titleBn: "বার্ষিক ক্রীড়া প্রতিযোগিতা", titleEn: "Annual Sports Day", descriptionBn: "শিক্ষার্থীদের বার্ষিক ক্রীড়া প্রতিযোগিতা।", descriptionEn: "The annual inter-class sports competition.", eventDate: addDays(today, 18), startTime: "09:00", location: "School field", imageUrl: "/images/gallery/outdoor-assembly.jpg", publicationStatus: "published" },
    { ...base, id: "event-02", titleBn: "অভিভাবক সমাবেশ", titleEn: "Parent-Teacher Meeting", descriptionBn: "শিক্ষার্থীর অগ্রগতি নিয়ে অভিভাবকদের সাথে আলোচনা।", descriptionEn: "Discussion with guardians about student progress.", eventDate: addDays(today, 7), startTime: "10:00", location: "School hall", imageUrl: "", publicationStatus: "published" },
    { ...base, id: "event-03", titleBn: "বিজ্ঞান মেলা", titleEn: "Science Fair", descriptionBn: "গত বছরের বিজ্ঞান মেলার আর্কাইভ।", descriptionEn: "Archive of last year's science fair.", eventDate: addDays(today, -120), imageUrl: "/images/gallery/creative-drawing.jpg", publicationStatus: "archived" },
  ],
  galleryItems: [
    { ...base, id: "gal-01", titleBn: "শ্রেণিকক্ষে শিক্ষার্থী", titleEn: "Students in class", imageUrl: "/images/gallery/girls-in-class.jpg", album: "Campus", sortOrder: 1, isPublished: true },
    { ...base, id: "gal-02", titleBn: "চিত্রাঙ্কন", titleEn: "Creative drawing", imageUrl: "/images/gallery/creative-drawing.jpg", album: "Activities", sortOrder: 2, isPublished: true },
    { ...base, id: "gal-03", titleBn: "সমাবেশ", titleEn: "Assembly", imageUrl: "/images/gallery/outdoor-assembly.jpg", album: "Campus", sortOrder: 3, isPublished: true },
    { ...base, id: "gal-04", titleBn: "লেখাপড়া", titleEn: "Writing practice", imageUrl: "/images/gallery/writing-practice.jpg", album: "Activities", sortOrder: 4, isPublished: true },
    { ...base, id: "gal-05", titleBn: "লাইব্রেরি", titleEn: "Library reading", imageUrl: "/images/gallery/library-reading.jpg", album: "Library", sortOrder: 5, isPublished: true },
    { ...base, id: "gal-06", titleBn: "জুনিয়র শ্রেণি", titleEn: "Junior class", imageUrl: "/images/gallery/junior-class.jpg", album: "Campus", sortOrder: 6, isPublished: true },
    { ...base, id: "gal-07", titleBn: "ক্যাম্পাস", titleEn: "Campus", imageUrl: "/images/school/campus.jpg", album: "Campus", sortOrder: 7, isPublished: true },
  ],
  testimonials: [
    { ...base, id: "test-01", parentName: "Guardian (sample)", parentNameBn: "অভিভাবক (নমুনা)", relation: "Mother", studentName: "Class 5", quoteBn: "[নমুনা মতামত — সেটিংস থেকে যাচাইকৃত মতামত যুক্ত করুন।]", quoteEn: "[Sample quote — add verified parent feedback from Settings.]", isPublished: false, isVerified: false },
    { ...base, id: "test-02", parentName: "Guardian (sample)", parentNameBn: "অভিভাবক (নমুনা)", relation: "Father", studentName: "Class 8", quoteBn: "[নমুনা মতামত — শিক্ষার্থীর অগ্রগতির নোটিশ সময়মতো পাই।]", quoteEn: "[Sample quote — we receive timely notices about progress.]", isPublished: false, isVerified: false },
  ],
  homework: [
    { ...base, id: "hw-01", titleBn: "গণিত অধ্যায় ৩ অনুশীলনী", titleEn: "Maths Chapter 3 Exercise", instructionsBn: "অনুশীলনী ৩.১ ও ৩.২ সমাধান করে খাতায় জমা দিন।", instructionsEn: "Solve exercise 3.1 and 3.2 and submit in your notebook.", classId: "class-5", sectionId: "sec-5a", subjectId: "sub-math", assignedBy: "tch-02", dueDate: addDays(today, 3), status: "published" },
    { ...base, id: "hw-02", titleBn: "ইংরেজি রচনা", titleEn: "English Composition", instructionsBn: "'My School' বিষয়ে ২০০ শব্দের রচনা লিখুন।", instructionsEn: "Write a 200-word composition on 'My School'.", classId: "class-8", sectionId: "sec-8a", subjectId: "sub-english", assignedBy: "tch-01", dueDate: addDays(today, 5), status: "published" },
  ],
  books: [
    { ...base, id: "book-01", title: "Bangla Textbook Class 5", titleBn: "বাংলা পাঠ্যবই পঞ্চম শ্রেণি", bookCode: "BAN-5", category: "textbook", author: "NCTB", totalCopies: 40, availableCopies: 38 },
    { ...base, id: "book-02", title: "Mathematics Class 8", titleBn: "গণিত অষ্টম শ্রেণি", bookCode: "MAT-8", category: "textbook", author: "NCTB", totalCopies: 35, availableCopies: 35 },
    { ...base, id: "book-03", title: "Science Encyclopedia", titleBn: "বিজ্ঞান বিশ্বকোষ", bookCode: "REF-01", category: "reference", totalCopies: 5, availableCopies: 4 },
    { ...base, id: "book-04", title: "Story Collection", titleBn: "গল্প সংকলন", bookCode: "STO-01", category: "story", totalCopies: 12, availableCopies: 12 },
  ],
  libraryTransactions: [
    { ...base, id: "lt-01", bookId: "book-03", memberUserId: "stu-0006", memberName: "Sabbir Hossain", memberType: "student", issuedAt: addDays(today, -6), dueDate: addDays(today, 8), finePaisa: 0, status: "issued", issuedBy: "demo-librarian" },
    { ...base, id: "lt-02", bookId: "book-01", memberUserId: "stu-0001", memberName: "Ayesha Siddiqua", memberType: "student", issuedAt: addDays(today, -20), dueDate: addDays(today, -6), finePaisa: 500, status: "overdue", issuedBy: "demo-librarian" },
  ],
  transportRoutes: [
    { ...base, id: "route-01", name: "North Route", vehicleId: "veh-01", driverName: "Abdul Malek", driverPhone: "", stops: ["Bazar", "Hospital Road", "School Gate"], monthlyFeePaisa: 60000, isActive: true },
    { ...base, id: "route-02", name: "South Route", vehicleId: "", driverName: "", driverPhone: "", stops: ["Riverside", "Bridge"], monthlyFeePaisa: 55000, isActive: true },
  ],
  vehicles: [{ ...base, id: "veh-01", registrationNo: "DEMO-0001", type: "Bus", capacity: 40, driverName: "Abdul Malek", status: "active" }],
  admissionApplications: [
    { ...base, id: "adm-01", studentName: "Prospective Student (demo)", dateOfBirth: "2015-04-11", gender: "male", applyingClassId: "class-1", guardianName: "Guardian (demo)", guardianPhone: "01700000099", guardianEmail: "", status: "pending", source: "public-website" },
  ],
  users: DEMO_USERS.map((u) => ({
    ...base,
    id: u.uid,
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    displayNameBn: u.displayNameBn,
    role: u.role,
    status: "active",
    preferredLanguage: "bn",
    studentId: "studentId" in u ? (u as { studentId: string }).studentId : undefined,
    teacherId: "teacherId" in u ? (u as { teacherId: string }).teacherId : undefined,
    guardianStudentIds: "guardianStudentIds" in u ? (u as { guardianStudentIds: string[] }).guardianStudentIds : [],
  })),
};

/** Seeds the local fallback driver once. Never touches Cloud Firestore. */
export async function ensureLocalSeed(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!localDbIsEmpty()) return false;
  for (const [name, rows] of Object.entries(SEED) as [CollectionName, Record<string, unknown>[]][]) {
    if (rows.length === 0) continue;
    await localDriver.bulkCreate(name, rows as never[]);
  }
  return true;
}

export const DEMO_SEED_VERSION = 1;
