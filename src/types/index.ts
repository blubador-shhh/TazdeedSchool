/**
 * Shared domain types for Tazdeed School.
 *
 * Cloud Firestore is the only application database. Every school-owned record
 * carries `schoolId` even though this release serves a single school, so the
 * Security Rules can always scope a read/write to one institution.
 */

export const ROLES = [
  "admin",
  "teacher",
  "accountant",
  "librarian",
  "student",
  "parent",
] as const;
export type Role = (typeof ROLES)[number];

export type AccountStatus = "active" | "disabled" | "invited";
export type Locale = "bn" | "en";
export type PublicationStatus = "draft" | "published" | "archived";
export type Visibility = "public" | "internal" | "students" | "parents" | "teachers";

/** Collections used by the application (mirrored in firestore.rules). */
export const COLLECTIONS = [
  "schools",
  "users",
  "students",
  "teachers",
  "guardians",
  "classes",
  "sections",
  "subjects",
  "academicSessions",
  "enrollments",
  "teacherAssignments",
  "attendanceRecords",
  "exams",
  "marks",
  "results",
  "gradingRules",
  "feeStructures",
  "invoices",
  "payments",
  "expenses",
  "notices",
  "events",
  "galleryItems",
  "testimonials",
  "homework",
  "homeworkSubmissions",
  "books",
  "libraryTransactions",
  "transportRoutes",
  "vehicles",
  "staff",
  "salaryRecords",
  "admissionApplications",
  "contactMessages",
  "notifications",
  "auditLogs",
  "counters",
  "schoolSettings",
  "publicSiteContent",
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

/** Collections an unauthenticated visitor may read (published public content). */
export const PUBLIC_READ_COLLECTIONS: CollectionName[] = [
  "schoolSettings",
  "publicSiteContent",
  "notices",
  "events",
  "galleryItems",
  "testimonials",
];

/** Collections an unauthenticated visitor may create into (narrowly scoped). */
export const PUBLIC_CREATE_COLLECTIONS: CollectionName[] = [
  "admissionApplications",
  "contactMessages",
];

export interface BaseDoc {
  id: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

/** Bilingual content helper — every public string may exist in bn + en. */
export interface Bilingual {
  bn?: string;
  en?: string;
}

export function pickBilingual(value: Bilingual | undefined, locale: Locale): string {
  if (!value) return "";
  return (locale === "bn" ? value.bn || value.en : value.en || value.bn) || "";
}

export interface SchoolUser extends BaseDoc {
  uid: string;
  displayName: string;
  displayNameBn?: string;
  email: string;
  phone?: string;
  photoUrl?: string;
  role: Role;
  status: AccountStatus;
  preferredLanguage: Locale;
  studentId?: string;
  teacherId?: string;
  guardianStudentIds?: string[];
  lastLoginAt?: string;
}

export type EnrollmentStatus = "active" | "promoted" | "graduated" | "archived";
export type Gender = "male" | "female" | "other";

export interface Student extends BaseDoc {
  admissionNo: string;
  rollNo: string;
  fullName: string;
  fullNameBn?: string;
  dateOfBirth: string;
  gender: Gender;
  photoUrl?: string;
  classId: string;
  sectionId: string;
  academicSessionId: string;
  guardianUids: string[];
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  address?: string;
  bloodGroup?: string;
  enrollmentStatus: EnrollmentStatus;
  userId?: string;
}

export interface Teacher extends BaseDoc {
  userId?: string;
  employeeId: string;
  name: string;
  nameBn?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  designation?: string;
  assignedSubjects: string[];
  assignedClasses: string[];
  status: AccountStatus;
}

export interface StaffMember extends BaseDoc {
  userId?: string;
  employeeId: string;
  name: string;
  nameBn?: string;
  designation: string;
  department?: string;
  phone?: string;
  email?: string;
  joiningDate?: string;
  monthlySalaryPaisa?: number;
  status: AccountStatus;
}

export interface ClassRoom extends BaseDoc {
  name: string;
  nameBn?: string;
  numericLevel: number;
  isActive: boolean;
}

export interface Section extends BaseDoc {
  classId: string;
  name: string;
  capacity: number;
  roomNo?: string;
}

export interface Subject extends BaseDoc {
  code: string;
  name: string;
  nameBn?: string;
  classIds: string[];
  creditHours: number;
  isOptional: boolean;
}

export interface AcademicSession extends BaseDoc {
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Enrollment extends BaseDoc {
  studentId: string;
  academicSessionId: string;
  classId: string;
  sectionId: string;
  rollNo: string;
  status: EnrollmentStatus;
}

export interface TeacherAssignment extends BaseDoc {
  teacherId: string;
  classId: string;
  sectionId?: string;
  subjectId: string;
  academicSessionId: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "leave";

export interface AttendanceRecord extends BaseDoc {
  studentId: string;
  classId: string;
  sectionId: string;
  /** School-local date, always `YYYY-MM-DD` (prevents duplicate marking). */
  dateKey: string;
  status: AttendanceStatus;
  note?: string;
  markedBy: string;
}

export interface Exam extends BaseDoc {
  name: string;
  nameBn?: string;
  category: string;
  academicSessionId: string;
  classIds: string[];
  startDate: string;
  endDate: string;
  gradingRuleId: string;
  publicationStatus: PublicationStatus;
}

export interface Mark extends BaseDoc {
  examId: string;
  studentId: string;
  subjectId: string;
  maximumMarks: number;
  passMarks: number;
  obtainedMarks: number | null;
  status: "pending" | "entered" | "absent";
  enteredBy: string;
}

export interface GradeBand {
  grade: string;
  point: number;
  /** Inclusive lower bound, in percent. */
  minPercent: number;
}

export interface GradingRule extends BaseDoc {
  name: string;
  /** Ordered descending by minPercent. */
  bands: GradeBand[];
  failGrade: string;
  failPoint: number;
  rounding: "none" | "half-up" | "floor";
  decimals: number;
  /** Optional subjects are dropped from the GPA when they are failed. */
  dropFailedOptional: boolean;
  absentCountsAsFail: boolean;
}

export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  maximumMarks: number;
  passMarks: number;
  obtainedMarks: number | null;
  percent: number | null;
  grade: string;
  point: number;
  status: "passed" | "failed" | "absent" | "missing" | "excluded-optional";
  counted: boolean;
}

export interface Result extends BaseDoc {
  examId: string;
  studentId: string;
  totalMarks: number;
  totalMaximum: number;
  percentage: number;
  grade: string;
  gpa: number;
  subjects: SubjectResult[];
  failedSubjects: number;
  status: "failed" | "passed";
  meritPosition: number | null;
  publicationStatus: PublicationStatus;
  approvedBy?: string;
  publishedAt?: string;
}

export interface FeeStructure extends BaseDoc {
  title: string;
  titleBn?: string;
  feeType: "tuition" | "admission" | "exam" | "transport" | "other";
  classIds: string[];
  academicSessionId: string;
  amountPaisa: number;
  frequency: "once" | "monthly" | "term";
  dueDayOfMonth?: number;
  isActive: boolean;
}

export type InvoiceStatus = "draft" | "unpaid" | "partial" | "paid" | "waived" | "overdue";

export interface Invoice extends BaseDoc {
  studentId: string;
  feeStructureId?: string;
  feeType: string;
  academicSessionId: string;
  period: string;
  amountPaisa: number;
  discountPaisa: number;
  paidAmountPaisa: number;
  dueAmountPaisa: number;
  status: InvoiceStatus;
  dueDate: string;
  receiptNo?: string;
}

export type PaymentMethod = "cash" | "bkash" | "nagad" | "rocket" | "bank" | "other";
export type VerificationStatus = "unverified" | "verified" | "rejected";

export interface Payment extends BaseDoc {
  invoiceId: string;
  studentId: string;
  amountPaisa: number;
  method: PaymentMethod;
  transactionReference?: string;
  verificationStatus: VerificationStatus;
  receivedBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  note?: string;
}

export interface Expense extends BaseDoc {
  title: string;
  category: string;
  amountPaisa: number;
  expenseDate: string;
  vendor?: string;
  reference?: string;
  recordedBy: string;
  note?: string;
}

export interface Notice extends BaseDoc {
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  category: string;
  visibility: Visibility;
  publicationStatus: PublicationStatus;
  publishedAt?: string;
  expiresAt?: string;
  attachmentUrl?: string;
  createdBy: string;
}

export interface SchoolEvent extends BaseDoc {
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  imageUrl?: string;
  publicationStatus: PublicationStatus;
}

export interface GalleryItem extends BaseDoc {
  titleBn?: string;
  titleEn?: string;
  caption?: string;
  imageUrl: string;
  album?: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface Testimonial extends BaseDoc {
  parentName: string;
  parentNameBn?: string;
  relation?: string;
  studentName?: string;
  quoteBn: string;
  quoteEn: string;
  photoUrl?: string;
  isPublished: boolean;
  /** True when the school has confirmed the quote is genuine. */
  isVerified: boolean;
}

export interface Homework extends BaseDoc {
  titleBn: string;
  titleEn: string;
  instructionsBn?: string;
  instructionsEn?: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  assignedBy: string;
  dueDate: string;
  status: PublicationStatus;
  /** External links only — Firebase Storage is not used in this project. */
  referenceUrl?: string;
}

export interface HomeworkSubmission extends BaseDoc {
  homeworkId: string;
  studentId: string;
  submittedAt: string;
  content: string;
  referenceUrl?: string;
  feedback?: string;
  grade?: string;
  reviewedBy?: string;
  status: "submitted" | "reviewed" | "late" | "missing";
}

export interface Book extends BaseDoc {
  title: string;
  titleBn?: string;
  author?: string;
  isbn?: string;
  bookCode: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  shelf?: string;
}

export interface LibraryTransaction extends BaseDoc {
  bookId: string;
  memberUserId: string;
  memberName: string;
  memberType: "student" | "teacher" | "staff";
  issuedAt: string;
  dueDate: string;
  returnedAt?: string;
  finePaisa: number;
  status: "issued" | "returned" | "overdue";
  issuedBy: string;
}

export interface TransportRoute extends BaseDoc {
  name: string;
  vehicleId?: string;
  driverName?: string;
  driverPhone?: string;
  stops: string[];
  monthlyFeePaisa: number;
  isActive: boolean;
}

export interface Vehicle extends BaseDoc {
  registrationNo: string;
  type: string;
  capacity: number;
  driverName?: string;
  status: "active" | "maintenance" | "retired";
}

export interface SalaryRecord extends BaseDoc {
  staffId: string;
  monthKey: string;
  basicPaisa: number;
  allowancesPaisa: number;
  deductionsPaisa: number;
  netPaisa: number;
  status: "draft" | "paid";
  paidAt?: string;
}

export interface AdmissionApplication extends BaseDoc {
  studentName: string;
  studentNameBn?: string;
  dateOfBirth: string;
  gender: Gender;
  applyingClassId: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  address?: string;
  previousSchool?: string;
  note?: string;
  /** Only staff may change this — public creates must leave it `pending`. */
  status: "pending" | "shortlisted" | "admitted" | "rejected";
  source: "public-website" | "office";
}

export interface ContactMessage extends BaseDoc {
  name: string;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
  status: "new" | "read" | "closed";
  source: "public-website";
}

export interface SchoolSettings extends BaseDoc {
  nameEn: string;
  nameBn: string;
  taglineEn?: string;
  taglineBn?: string;
  logoUrl?: string;
  addressEn?: string;
  addressBn?: string;
  phone?: string;
  email?: string;
  openingHours?: string;
  mapUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  linkedinUrl?: string;
  currency: string;
  currencyLocale: string;
  timezone: string;
  currentSessionId?: string;
  establishedYear?: number;
}

export interface PublicSiteContent extends BaseDoc {
  heroTitleBn: string;
  heroTitleEn: string;
  heroSubtitleBn: string;
  heroSubtitleEn: string;
  heroImageUrl?: string;
  aboutTitleBn?: string;
  aboutTitleEn?: string;
  aboutBodyBn?: string;
  aboutBodyEn?: string;
  visionBn?: string;
  visionEn?: string;
  missionBn?: string;
  missionEn?: string;
  aboutImageUrl?: string;
  stats: { id: string; labelBn: string; labelEn: string; value: string; show: boolean }[];
  features: { id: string; icon: string; titleBn: string; titleEn: string; bodyBn: string; bodyEn: string; show: boolean }[];
  programs: { id: string; titleBn: string; titleEn: string; bodyBn: string; bodyEn: string; active: boolean }[];
  facilities: { id: string; icon: string; titleBn: string; titleEn: string; bodyBn: string; bodyEn: string; show: boolean }[];
  showTestimonials: boolean;
  showStats: boolean;
}

export interface AuditLog extends BaseDoc {
  actorUid: string;
  action: string;
  collectionName: CollectionName;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
}

export interface Counter extends BaseDoc {
  name: string;
  value: number;
}

export interface NotificationItem extends BaseDoc {
  audience: Role[];
  targetUid?: string;
  titleBn: string;
  titleEn: string;
  bodyBn?: string;
  bodyEn?: string;
  link?: string;
  readBy: string[];
}
