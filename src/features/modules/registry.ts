import type { ModuleDefinition } from "@/features/modules/schema";

const bnEn = (bn: string, en: string) => ({ bn, en });

const CLASS_SOURCE = {
  collection: "classes" as const,
  labelEn: "name",
  labelBn: "nameBn",
  orderBy: [["numericLevel", "asc"] as [string, "asc"]],
};
const SECTION_SOURCE = { collection: "sections" as const, labelEn: "name", orderBy: [["name", "asc"] as [string, "asc"]] };
const SUBJECT_SOURCE = { collection: "subjects" as const, labelEn: "name", labelBn: "nameBn", orderBy: [["name", "asc"] as [string, "asc"]] };
const SESSION_SOURCE = { collection: "academicSessions" as const, labelEn: "name", orderBy: [["name", "desc"] as [string, "desc"]] };
const STUDENT_SOURCE = { collection: "students" as const, labelEn: "fullName", labelBn: "fullNameBn", orderBy: [["admissionNo", "asc"] as [string, "asc"]] };

const STATUS_OPTIONS = [
  { value: "active", label: bnEn("সক্রিয়", "Active") },
  { value: "disabled", label: bnEn("নিষ্ক্রিয়", "Disabled") },
];

const PUBLICATION_OPTIONS = [
  { value: "draft", label: bnEn("খসড়া", "Draft") },
  { value: "published", label: bnEn("প্রকাশিত", "Published") },
  { value: "archived", label: bnEn("আর্কাইভ", "Archived") },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: bnEn("সার্বজনীন", "Public") },
  { value: "internal", label: bnEn("অভ্যন্তরীণ", "Internal") },
  { value: "students", label: bnEn("শিক্ষার্থী", "Students") },
  { value: "parents", label: bnEn("অভিভাবক", "Parents") },
  { value: "teachers", label: bnEn("শিক্ষক", "Teachers") },
];

const GENDER_OPTIONS = [
  { value: "male", label: bnEn("ছেলে", "Male") },
  { value: "female", label: bnEn("মেয়ে", "Female") },
  { value: "other", label: bnEn("অন্যান্য", "Other") },
];

/* --------------------------------- Students -------------------------------- */

export const studentsModule: ModuleDefinition = {
  id: "students",
  collection: "students",
  unique: ["admissionNo"],
  title: bnEn("শিক্ষার্থী ব্যবস্থাপনা", "Student management"),
  description: bnEn("ভর্তি, শ্রেণি বিন্যাস ও অভিভাবক সংযোগ।", "Admission numbers, class assignment and guardian links."),
  capability: "students.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["fullName", "fullNameBn", "admissionNo", "rollNo", "guardianName", "guardianPhone"],
  orderBy: [["admissionNo", "asc"]],
  filters: [
    { field: "classId", label: bnEn("শ্রেণি", "Class"), options: [] },
    { field: "enrollmentStatus", label: bnEn("অবস্থা", "Status"), options: [
      { value: "active", label: bnEn("চালু", "Active") },
      { value: "promoted", label: bnEn("উত্তীর্ণ", "Promoted") },
      { value: "graduated", label: bnEn("স্নাতক", "Graduated") },
      { value: "archived", label: bnEn("আর্কাইভ", "Archived") },
    ] },
  ],
  fields: [
    { name: "admissionNo", label: bnEn("ভর্তি নম্বর", "Admission no."), type: "text", required: true, inTable: true, maxLength: 30 },
    { name: "rollNo", label: bnEn("রোল নম্বর", "Roll no."), type: "text", required: true, inTable: true, maxLength: 12 },
    { name: "fullName", label: bnEn("নাম (ইংরেজি)", "Full name (English)"), type: "text", required: true, inTable: true, tableAs: "text", maxLength: 80 },
    { name: "fullNameBn", label: bnEn("নাম (বাংলা)", "Full name (Bengali)"), type: "text", inTable: true, tableAs: "bilingual", maxLength: 80 },
    { name: "dateOfBirth", label: bnEn("জন্মতারিখ", "Date of birth"), type: "date", required: true, inTable: true, tableAs: "date", hideOnMobile: true },
    { name: "gender", label: bnEn("লিঙ্গ", "Gender"), type: "select", required: true, options: GENDER_OPTIONS, inTable: true, tableAs: "badge", hideOnMobile: true },
    { name: "classId", label: bnEn("শ্রেণি", "Class"), type: "select", required: true, source: CLASS_SOURCE, inTable: true },
    { name: "sectionId", label: bnEn("শাখা", "Section"), type: "select", required: true, source: SECTION_SOURCE, inTable: true, hideOnMobile: true },
    { name: "academicSessionId", label: bnEn("শিক্ষাবর্ষ", "Academic session"), type: "select", required: true, source: SESSION_SOURCE },
    { name: "guardianName", label: bnEn("অভিভাবকের নাম", "Guardian name"), type: "text", inTable: true, hideOnMobile: true, maxLength: 80 },
    { name: "guardianPhone", label: bnEn("অভিভাবকের মোবাইল", "Guardian mobile"), type: "text", maxLength: 20, inTable: true, hideOnMobile: true },
    { name: "guardianEmail", label: bnEn("অভিভাবকের ইমেইল", "Guardian email"), type: "text", maxLength: 120 },
    { name: "address", label: bnEn("ঠিকানা", "Address"), type: "textarea", span: 2, maxLength: 300 },
    { name: "bloodGroup", label: bnEn("রক্তের গ্রুপ", "Blood group"), type: "text", maxLength: 5 },
    { name: "photoUrl", label: bnEn("ছবির https URL", "Photo https URL"), type: "text", maxLength: 400, hint: bnEn("Firebase Storage ব্যবহার করা হয় না — কেবল যাচাইকৃত https লিংক।", "Firebase Storage is not used — validated https links only.") },
    { name: "enrollmentStatus", label: bnEn("ভর্তি অবস্থা", "Enrolment status"), type: "select", required: true, inTable: true, tableAs: "badge", options: [
      { value: "active", label: bnEn("চালু", "Active") },
      { value: "promoted", label: bnEn("উত্তীর্ণ", "Promoted") },
      { value: "graduated", label: bnEn("স্নাতক", "Graduated") },
      { value: "archived", label: bnEn("আর্কাইভ", "Archived") },
    ], defaultValue: "active" },
    { name: "guardianUids", label: bnEn("অভিভাবক ইউআইডি (কমা দিয়ে)", "Guardian UIDs (comma separated)"), type: "multiselect", readOnly: false },
  ],
};

/* --------------------------------- Teachers -------------------------------- */

export const teachersModule: ModuleDefinition = {
  id: "teachers",
  collection: "teachers",
  unique: ["employeeId"],
  title: bnEn("শিক্ষক ব্যবস্থাপনা", "Teacher management"),
  capability: "teachers.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["name", "nameBn", "employeeId", "email", "designation"],
  orderBy: [["employeeId", "asc"]],
  fields: [
    { name: "employeeId", label: bnEn("কর্মী আইডি", "Employee ID"), type: "text", required: true, inTable: true, maxLength: 20 },
    { name: "name", label: bnEn("নাম (ইংরেজি)", "Name (English)"), type: "text", required: true, inTable: true, maxLength: 80 },
    { name: "nameBn", label: bnEn("নাম (বাংলা)", "Name (Bengali)"), type: "text", inTable: true, tableAs: "bilingual", maxLength: 80 },
    { name: "designation", label: bnEn("পদবি", "Designation"), type: "text", inTable: true, maxLength: 60 },
    { name: "email", label: bnEn("ইমেইল", "Email"), type: "text", inTable: true, hideOnMobile: true, maxLength: 120 },
    { name: "phone", label: bnEn("মোবাইল", "Phone"), type: "text", inTable: true, hideOnMobile: true, maxLength: 20 },
    { name: "assignedClasses", label: bnEn("দায়িত্বপ্রাপ্ত শ্রেণি", "Assigned classes"), type: "multiselect", hint: bnEn("শ্রেণির আইডি, কমা দিয়ে আলাদা।", "Class IDs, comma separated.") },
    { name: "assignedSubjects", label: bnEn("দায়িত্বপ্রাপ্ত বিষয়", "Assigned subjects"), type: "multiselect", hint: bnEn("বিষয়ের আইডি, কমা দিয়ে আলাদা।", "Subject IDs, comma separated.") },
    { name: "userId", label: bnEn("লগইন ইউআইডি", "Login UID"), type: "text", maxLength: 60 },
    { name: "status", label: bnEn("অবস্থা", "Status"), type: "select", required: true, options: STATUS_OPTIONS, inTable: true, tableAs: "badge", defaultValue: "active" },
  ],
};

/* ---------------------------------- Staff ---------------------------------- */

export const staffModule: ModuleDefinition = {
  id: "staff",
  collection: "staff",
  unique: ["employeeId"],
  title: bnEn("স্টাফ ও এইচআর", "Staff & HR"),
  capability: "staff.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["name", "nameBn", "employeeId", "designation", "department"],
  orderBy: [["employeeId", "asc"]],
  fields: [
    { name: "employeeId", label: bnEn("কর্মী আইডি", "Employee ID"), type: "text", required: true, inTable: true, maxLength: 20 },
    { name: "name", label: bnEn("নাম", "Name"), type: "text", required: true, inTable: true, maxLength: 80 },
    { name: "nameBn", label: bnEn("নাম (বাংলা)", "Name (Bengali)"), type: "text", inTable: true, tableAs: "bilingual", maxLength: 80 },
    { name: "designation", label: bnEn("পদবি", "Designation"), type: "text", required: true, inTable: true, maxLength: 60 },
    { name: "department", label: bnEn("বিভাগ", "Department"), type: "text", inTable: true, hideOnMobile: true, maxLength: 60 },
    { name: "phone", label: bnEn("মোবাইল", "Phone"), type: "text", inTable: true, hideOnMobile: true, maxLength: 20 },
    { name: "email", label: bnEn("ইমেইল", "Email"), type: "text", maxLength: 120 },
    { name: "joiningDate", label: bnEn("যোগদানের তারিখ", "Joining date"), type: "date", inTable: true, tableAs: "date", hideOnMobile: true },
    { name: "monthlySalaryPaisa", label: bnEn("মাসিক বেতন (পয়সা)", "Monthly salary (paisa)"), type: "number", min: 0, inTable: true, tableAs: "money", hint: bnEn("১ টাকা = ১০০ পয়সা।", "1 taka = 100 paisa.") },
    { name: "status", label: bnEn("অবস্থা", "Status"), type: "select", required: true, options: STATUS_OPTIONS, inTable: true, tableAs: "badge", defaultValue: "active" },
  ],
};

/* -------------------------------- Academics -------------------------------- */

export const classesModule: ModuleDefinition = {
  id: "classes",
  collection: "classes",
  title: bnEn("শ্রেণি", "Classes"),
  capability: "academics.view",
  pageSize: 20,
  allowDelete: true,
  searchFields: ["name", "nameBn"],
  orderBy: [["numericLevel", "asc"]],
  fields: [
    { name: "name", label: bnEn("নাম (ইংরেজি)", "Name (English)"), type: "text", required: true, inTable: true, maxLength: 40 },
    { name: "nameBn", label: bnEn("নাম (বাংলা)", "Name (Bengali)"), type: "text", inTable: true, tableAs: "bilingual", maxLength: 40 },
    { name: "numericLevel", label: bnEn("ক্রম", "Numeric level"), type: "number", required: true, min: 0, max: 20, inTable: true },
    { name: "isActive", label: bnEn("চালু", "Active"), type: "boolean", inTable: true, tableAs: "badge", defaultValue: true },
  ],
};

export const sectionsModule: ModuleDefinition = {
  id: "sections",
  collection: "sections",
  title: bnEn("শাখা", "Sections"),
  capability: "academics.view",
  pageSize: 20,
  allowDelete: true,
  searchFields: ["name"],
  orderBy: [["name", "asc"]],
  fields: [
    { name: "classId", label: bnEn("শ্রেণি", "Class"), type: "select", required: true, source: CLASS_SOURCE, inTable: true },
    { name: "name", label: bnEn("শাখার নাম", "Section name"), type: "text", required: true, inTable: true, maxLength: 10 },
    { name: "capacity", label: bnEn("ধারণক্ষমতা", "Capacity"), type: "number", required: true, min: 1, max: 500, inTable: true },
    { name: "roomNo", label: bnEn("কক্ষ নম্বর", "Room no."), type: "text", maxLength: 20, inTable: true, hideOnMobile: true },
  ],
};

export const subjectsModule: ModuleDefinition = {
  id: "subjects",
  collection: "subjects",
  title: bnEn("বিষয়", "Subjects"),
  capability: "academics.view",
  pageSize: 20,
  allowDelete: true,
  searchFields: ["name", "nameBn", "code"],
  orderBy: [["code", "asc"]],
  fields: [
    { name: "code", label: bnEn("কোড", "Code"), type: "text", required: true, inTable: true, maxLength: 12 },
    { name: "name", label: bnEn("নাম (ইংরেজি)", "Name (English)"), type: "text", required: true, inTable: true, maxLength: 60 },
    { name: "nameBn", label: bnEn("নাম (বাংলা)", "Name (Bengali)"), type: "text", inTable: true, tableAs: "bilingual", maxLength: 60 },
    { name: "creditHours", label: bnEn("ক্রেডিট", "Credit hours"), type: "number", required: true, min: 0, max: 20, inTable: true },
    { name: "isOptional", label: bnEn("ঐচ্ছিক", "Optional"), type: "boolean", inTable: true, tableAs: "badge" },
    { name: "classIds", label: bnEn("শ্রেণি আইডি (কমা দিয়ে)", "Class IDs (comma separated)"), type: "multiselect", span: 2 },
  ],
};

export const sessionsModule: ModuleDefinition = {
  id: "academicSessions",
  collection: "academicSessions",
  title: bnEn("শিক্ষাবর্ষ", "Academic sessions"),
  capability: "academics.view",
  pageSize: 20,
  allowDelete: true,
  searchFields: ["name"],
  orderBy: [["name", "desc"]],
  fields: [
    { name: "name", label: bnEn("নাম", "Name"), type: "text", required: true, inTable: true, maxLength: 20 },
    { name: "startDate", label: bnEn("শুরুর তারিখ", "Start date"), type: "date", required: true, inTable: true, tableAs: "date" },
    { name: "endDate", label: bnEn("শেষ তারিখ", "End date"), type: "date", required: true, inTable: true, tableAs: "date", hideOnMobile: true },
    { name: "isCurrent", label: bnEn("চলতি শিক্ষাবর্ষ", "Current session"), type: "boolean", inTable: true, tableAs: "badge" },
  ],
};

/* ------------------------------ Communication ------------------------------ */

export const noticesModule: ModuleDefinition = {
  id: "notices",
  collection: "notices",
  title: bnEn("নোটিশ ব্যবস্থাপনা", "Notice management"),
  capability: "notices.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["titleBn", "titleEn", "category"],
  orderBy: [["createdAt", "desc"]],
  filters: [{ field: "publicationStatus", label: bnEn("অবস্থা", "Status"), options: PUBLICATION_OPTIONS }],
  fields: [
    { name: "titleBn", label: bnEn("শিরোনাম (বাংলা)", "Title (Bengali)"), type: "text", required: true, inTable: true, tableAs: "bilingual", span: 2, maxLength: 160 },
    { name: "titleEn", label: bnEn("শিরোনাম (ইংরেজি)", "Title (English)"), type: "text", required: true, span: 2, maxLength: 160 },
    { name: "descriptionBn", label: bnEn("বিবরণ (বাংলা)", "Description (Bengali)"), type: "textarea", span: 2 },
    { name: "descriptionEn", label: bnEn("বিবরণ (ইংরেজি)", "Description (English)"), type: "textarea", span: 2 },
    { name: "category", label: bnEn("ক্যাটাগরি", "Category"), type: "text", required: true, inTable: true, tableAs: "badge", maxLength: 40 },
    { name: "visibility", label: bnEn("কারা দেখবে", "Audience"), type: "select", required: true, options: VISIBILITY_OPTIONS, inTable: true, tableAs: "badge", defaultValue: "public" },
    { name: "publicationStatus", label: bnEn("প্রকাশের অবস্থা", "Publication status"), type: "select", required: true, options: PUBLICATION_OPTIONS, inTable: true, tableAs: "badge", defaultValue: "draft" },
    { name: "publishedAt", label: bnEn("প্রকাশের তারিখ", "Published at"), type: "date", inTable: true, tableAs: "date", hideOnMobile: true },
    { name: "expiresAt", label: bnEn("মেয়াদ শেষ", "Expires at"), type: "date" },
    { name: "attachmentUrl", label: bnEn("সংযুক্তির https URL", "Attachment https URL"), type: "text", span: 2, maxLength: 400 },
  ],
  onCreate: (values) => ({ ...values, createdBy: values.createdBy ?? "system" }),
};

export const eventsModule: ModuleDefinition = {
  id: "events",
  collection: "events",
  title: bnEn("ইভেন্ট ব্যবস্থাপনা", "Event management"),
  capability: "events.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["titleBn", "titleEn", "location"],
  orderBy: [["eventDate", "asc"]],
  filters: [{ field: "publicationStatus", label: bnEn("অবস্থা", "Status"), options: PUBLICATION_OPTIONS }],
  fields: [
    { name: "titleBn", label: bnEn("শিরোনাম (বাংলা)", "Title (Bengali)"), type: "text", required: true, inTable: true, tableAs: "bilingual", span: 2, maxLength: 160 },
    { name: "titleEn", label: bnEn("শিরোনাম (ইংরেজি)", "Title (English)"), type: "text", required: true, span: 2, maxLength: 160 },
    { name: "descriptionBn", label: bnEn("বিবরণ (বাংলা)", "Description (Bengali)"), type: "textarea", span: 2 },
    { name: "descriptionEn", label: bnEn("বিবরণ (ইংরেজি)", "Description (English)"), type: "textarea", span: 2 },
    { name: "eventDate", label: bnEn("তারিখ", "Date"), type: "date", required: true, inTable: true, tableAs: "date" },
    { name: "startTime", label: bnEn("শুরুর সময়", "Start time"), type: "text", maxLength: 8, inTable: true, hideOnMobile: true },
    { name: "endTime", label: bnEn("শেষের সময়", "End time"), type: "text", maxLength: 8 },
    { name: "location", label: bnEn("স্থান", "Location"), type: "text", maxLength: 120, inTable: true, hideOnMobile: true },
    { name: "imageUrl", label: bnEn("ছবির https URL", "Image https URL"), type: "text", maxLength: 400, span: 2 },
    { name: "publicationStatus", label: bnEn("প্রকাশের অবস্থা", "Publication status"), type: "select", required: true, options: PUBLICATION_OPTIONS, inTable: true, tableAs: "badge", defaultValue: "draft" },
  ],
};

export const homeworkModule: ModuleDefinition = {
  id: "homework",
  collection: "homework",
  title: bnEn("গৃহকর্ম", "Homework"),
  capability: "homework.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["titleBn", "titleEn"],
  orderBy: [["dueDate", "asc"]],
  filters: [{ field: "classId", label: bnEn("শ্রেণি", "Class"), options: [] }],
  fields: [
    { name: "titleBn", label: bnEn("শিরোনাম (বাংলা)", "Title (Bengali)"), type: "text", required: true, inTable: true, tableAs: "bilingual", span: 2, maxLength: 160 },
    { name: "titleEn", label: bnEn("শিরোনাম (ইংরেজি)", "Title (English)"), type: "text", required: true, span: 2, maxLength: 160 },
    { name: "instructionsBn", label: bnEn("নির্দেশনা (বাংলা)", "Instructions (Bengali)"), type: "textarea", span: 2 },
    { name: "instructionsEn", label: bnEn("নির্দেশনা (ইংরেজি)", "Instructions (English)"), type: "textarea", span: 2 },
    { name: "classId", label: bnEn("শ্রেণি", "Class"), type: "select", required: true, source: CLASS_SOURCE, inTable: true },
    { name: "sectionId", label: bnEn("শাখা", "Section"), type: "select", required: true, source: SECTION_SOURCE, inTable: true, hideOnMobile: true },
    { name: "subjectId", label: bnEn("বিষয়", "Subject"), type: "select", required: true, source: SUBJECT_SOURCE, inTable: true, hideOnMobile: true },
    { name: "dueDate", label: bnEn("জমার শেষ তারিখ", "Due date"), type: "date", required: true, inTable: true, tableAs: "date" },
    { name: "status", label: bnEn("অবস্থা", "Status"), type: "select", required: true, options: PUBLICATION_OPTIONS, inTable: true, tableAs: "badge", defaultValue: "published" },
    { name: "referenceUrl", label: bnEn("রেফারেন্স https URL", "Reference https URL"), type: "text", maxLength: 400, span: 2, hint: bnEn("ফাইল আপলোড সুবিধা নেই (Firebase Storage নিষিদ্ধ)।", "No file uploads — Firebase Storage is not used.") },
  ],
};

/* ---------------------------------- Library -------------------------------- */

export const booksModule: ModuleDefinition = {
  id: "books",
  collection: "books",
  unique: ["bookCode"],
  title: bnEn("বইয়ের তালিকা", "Book catalogue"),
  capability: "library.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["title", "titleBn", "bookCode", "isbn", "author", "category"],
  orderBy: [["bookCode", "asc"]],
  filters: [{ field: "category", label: bnEn("ক্যাটাগরি", "Category"), options: [] }],
  fields: [
    { name: "bookCode", label: bnEn("বুক কোড", "Book code"), type: "text", required: true, inTable: true, maxLength: 24 },
    { name: "title", label: bnEn("শিরোনাম", "Title"), type: "text", required: true, inTable: true, maxLength: 120 },
    { name: "titleBn", label: bnEn("শিরোনাম (বাংলা)", "Title (Bengali)"), type: "text", inTable: true, tableAs: "bilingual", maxLength: 120 },
    { name: "author", label: bnEn("লেখক", "Author"), type: "text", inTable: true, hideOnMobile: true, maxLength: 80 },
    { name: "isbn", label: bnEn("আইএসবিএন", "ISBN"), type: "text", maxLength: 24, hideOnMobile: true },
    { name: "category", label: bnEn("ক্যাটাগরি", "Category"), type: "text", required: true, inTable: true, tableAs: "badge", maxLength: 40 },
    { name: "totalCopies", label: bnEn("মোট কপি", "Total copies"), type: "number", required: true, min: 0, max: 100000, inTable: true },
    { name: "availableCopies", label: bnEn("সহজলভ্য কপি", "Available copies"), type: "number", required: true, min: 0, max: 100000, inTable: true, tableAs: "badge" },
    { name: "shelf", label: bnEn("তাক", "Shelf"), type: "text", maxLength: 24, hideOnMobile: true },
  ],
};

/* --------------------------------- Transport ------------------------------- */

export const transportModule: ModuleDefinition = {
  id: "transportRoutes",
  collection: "transportRoutes",
  title: bnEn("পরিবহন রুট", "Transport routes"),
  capability: "transport.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["name", "driverName"],
  orderBy: [["name", "asc"]],
  fields: [
    { name: "name", label: bnEn("রুটের নাম", "Route name"), type: "text", required: true, inTable: true, maxLength: 60 },
    { name: "stops", label: bnEn("স্টপ (কমা দিয়ে)", "Stops (comma separated)"), type: "multiselect", span: 2, inTable: true },
    { name: "driverName", label: bnEn("চালকের নাম", "Driver name"), type: "text", inTable: true, hideOnMobile: true, maxLength: 60 },
    { name: "driverPhone", label: bnEn("চালকের মোবাইল", "Driver phone"), type: "text", maxLength: 20, hideOnMobile: true },
    { name: "vehicleId", label: bnEn("যানের আইডি", "Vehicle ID"), type: "text", maxLength: 40 },
    { name: "monthlyFeePaisa", label: bnEn("মাসিক ফি (পয়সা)", "Monthly fee (paisa)"), type: "number", required: true, min: 0, inTable: true, tableAs: "money" },
    { name: "isActive", label: bnEn("চালু", "Active"), type: "boolean", inTable: true, tableAs: "badge", defaultValue: true },
  ],
};

export const vehiclesModule: ModuleDefinition = {
  id: "vehicles",
  collection: "vehicles",
  title: bnEn("যানবাহন", "Vehicles"),
  capability: "transport.view",
  pageSize: 10,
  allowDelete: true,
  searchFields: ["registrationNo", "driverName", "type"],
  orderBy: [["registrationNo", "asc"]],
  fields: [
    { name: "registrationNo", label: bnEn("রেজিস্ট্রেশন নম্বর", "Registration no."), type: "text", required: true, inTable: true, maxLength: 24 },
    { name: "type", label: bnEn("ধরন", "Type"), type: "text", required: true, inTable: true, tableAs: "badge", maxLength: 24 },
    { name: "capacity", label: bnEn("ধারণক্ষমতা", "Capacity"), type: "number", required: true, min: 1, max: 200, inTable: true },
    { name: "driverName", label: bnEn("চালক", "Driver"), type: "text", inTable: true, hideOnMobile: true, maxLength: 60 },
    { name: "status", label: bnEn("অবস্থা", "Status"), type: "select", required: true, inTable: true, tableAs: "badge", options: [
      { value: "active", label: bnEn("চালু", "Active") },
      { value: "maintenance", label: bnEn("রক্ষণাবেক্ষণ", "Maintenance") },
      { value: "retired", label: bnEn("অবসর", "Retired") },
    ], defaultValue: "active" },
  ],
};

/* ---------------------------------- Finance -------------------------------- */

export const expensesModule: ModuleDefinition = {
  id: "expenses",
  collection: "expenses",
  title: bnEn("ব্যয় ব্যবস্থাপনা", "Expense management"),
  capability: "expenses.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["title", "category", "vendor"],
  orderBy: [["expenseDate", "desc"]],
  filters: [{ field: "category", label: bnEn("ক্যাটাগরি", "Category"), options: [] }],
  fields: [
    { name: "title", label: bnEn("বিবরণ", "Title"), type: "text", required: true, inTable: true, maxLength: 120 },
    { name: "category", label: bnEn("ক্যাটাগরি", "Category"), type: "text", required: true, inTable: true, tableAs: "badge", maxLength: 40 },
    { name: "amountPaisa", label: bnEn("পরিমাণ (পয়সা)", "Amount (paisa)"), type: "number", required: true, min: 1, inTable: true, tableAs: "money" },
    { name: "expenseDate", label: bnEn("তারিখ", "Date"), type: "date", required: true, inTable: true, tableAs: "date" },
    { name: "vendor", label: bnEn("সরবরাহকারী", "Vendor"), type: "text", inTable: true, hideOnMobile: true, maxLength: 80 },
    { name: "reference", label: bnEn("রেফারেন্স", "Reference"), type: "text", maxLength: 60, hideOnMobile: true },
    { name: "note", label: bnEn("মন্তব্য", "Note"), type: "textarea", span: 2, maxLength: 400 },
  ],
  onCreate: (values) => ({ ...values, recordedBy: values.recordedBy ?? "system" }),
};

export const feeStructuresModule: ModuleDefinition = {
  id: "feeStructures",
  collection: "feeStructures",
  title: bnEn("ফি কাঠামো", "Fee structures"),
  capability: "fees.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["title", "titleBn", "feeType"],
  orderBy: [["createdAt", "desc"]],
  fields: [
    { name: "title", label: bnEn("নাম (ইংরেজি)", "Title (English)"), type: "text", required: true, inTable: true, maxLength: 80 },
    { name: "titleBn", label: bnEn("নাম (বাংলা)", "Title (Bengali)"), type: "text", inTable: true, tableAs: "bilingual", maxLength: 80 },
    { name: "feeType", label: bnEn("ধরন", "Fee type"), type: "select", required: true, inTable: true, tableAs: "badge", options: [
      { value: "tuition", label: bnEn("মাসিক বেতন", "Tuition") },
      { value: "admission", label: bnEn("ভর্তি ফি", "Admission") },
      { value: "exam", label: bnEn("পরীক্ষা ফি", "Exam") },
      { value: "transport", label: bnEn("পরিবহন ফি", "Transport") },
      { value: "other", label: bnEn("অন্যান্য", "Other") },
    ] },
    { name: "amountPaisa", label: bnEn("পরিমাণ (পয়সা)", "Amount (paisa)"), type: "number", required: true, min: 0, inTable: true, tableAs: "money" },
    { name: "frequency", label: bnEn("পুনরাবৃত্তি", "Frequency"), type: "select", required: true, inTable: true, tableAs: "badge", options: [
      { value: "once", label: bnEn("এককালীন", "One time") },
      { value: "monthly", label: bnEn("মাসিক", "Monthly") },
      { value: "term", label: bnEn("সাময়িক", "Term") },
    ] },
    { name: "academicSessionId", label: bnEn("শিক্ষাবর্ষ", "Session"), type: "select", required: true, source: SESSION_SOURCE },
    { name: "dueDayOfMonth", label: bnEn("মাসের যে দিনে", "Due day of month"), type: "number", min: 1, max: 28 },
    { name: "classIds", label: bnEn("প্রযোজ্য শ্রেণি (কমা দিয়ে)", "Applies to classes (comma separated)"), type: "multiselect", span: 2 },
    { name: "isActive", label: bnEn("চালু", "Active"), type: "boolean", inTable: true, tableAs: "badge", defaultValue: true },
  ],
};

/* --------------------------------- Website --------------------------------- */

export const galleryModule: ModuleDefinition = {
  id: "galleryItems",
  collection: "galleryItems",
  title: bnEn("ছবি গ্যালারি", "Photo gallery"),
  capability: "site.manage",
  pageSize: 12,
  allowDelete: true,
  searchFields: ["titleEn", "titleBn", "album"],
  orderBy: [["sortOrder", "asc"]],
  fields: [
    { name: "titleEn", label: bnEn("শিরোনাম (ইংরেজি)", "Title (English)"), type: "text", required: true, inTable: true, maxLength: 120 },
    { name: "titleBn", label: bnEn("শিরোনাম (বাংলা)", "Title (Bengali)"), type: "text", inTable: true, tableAs: "bilingual", maxLength: 120 },
    { name: "imageUrl", label: bnEn("ছবির URL", "Image URL"), type: "text", required: true, span: 2, maxLength: 400, hint: bnEn("/images/... অথবা https:// লিংক।", "/images/… or an https:// link.") },
    { name: "album", label: bnEn("অ্যালবাম", "Album"), type: "text", inTable: true, tableAs: "badge", maxLength: 40 },
    { name: "sortOrder", label: bnEn("ক্রম", "Sort order"), type: "number", required: true, min: 0, max: 9999, inTable: true },
    { name: "isPublished", label: bnEn("প্রকাশিত", "Published"), type: "boolean", inTable: true, tableAs: "badge", defaultValue: true },
  ],
};

export const testimonialsModule: ModuleDefinition = {
  id: "testimonials",
  collection: "testimonials",
  title: bnEn("অভিভাবক মতামত", "Parent testimonials"),
  capability: "site.manage",
  pageSize: 10,
  allowDelete: true,
  searchFields: ["parentName", "parentNameBn", "quoteEn", "quoteBn"],
  orderBy: [["createdAt", "desc"]],
  fields: [
    { name: "parentName", label: bnEn("অভিভাবকের নাম (ইংরেজি)", "Parent name (English)"), type: "text", required: true, inTable: true, maxLength: 80 },
    { name: "parentNameBn", label: bnEn("অভিভাবকের নাম (বাংলা)", "Parent name (Bengali)"), type: "text", inTable: true, tableAs: "bilingual", maxLength: 80 },
    { name: "relation", label: bnEn("সম্পর্ক", "Relation"), type: "text", maxLength: 30, inTable: true, hideOnMobile: true },
    { name: "studentName", label: bnEn("শিক্ষার্থীর নাম", "Student name"), type: "text", maxLength: 80, hideOnMobile: true },
    { name: "quoteEn", label: bnEn("মতামত (ইংরেজি)", "Quote (English)"), type: "textarea", required: true, span: 2 },
    { name: "quoteBn", label: bnEn("মতামত (বাংলা)", "Quote (Bengali)"), type: "textarea", span: 2 },
    { name: "isVerified", label: bnEn("যাচাইকৃত", "Verified by school"), type: "boolean", inTable: true, tableAs: "badge", hint: bnEn("যাচাই ছাড়া মতামত প্রকাশ করা হয় না।", "Unverified quotes are never published.") },
    { name: "isPublished", label: bnEn("প্রকাশিত", "Published"), type: "boolean", inTable: true, tableAs: "badge" },
  ],
};

/* -------------------------------- Admissions ------------------------------- */

export const admissionApplicationsModule: ModuleDefinition = {
  id: "admissionApplications",
  collection: "admissionApplications",
  title: bnEn("ভর্তি আবেদন", "Admission applications"),
  capability: "admissions.review",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["studentName", "guardianName", "guardianPhone"],
  orderBy: [["createdAt", "desc"]],
  filters: [{ field: "status", label: bnEn("অবস্থা", "Status"), options: [
    { value: "pending", label: bnEn("অপেক্ষমাণ", "Pending") },
    { value: "shortlisted", label: bnEn("বাছাইকৃত", "Shortlisted") },
    { value: "admitted", label: bnEn("ভর্তি", "Admitted") },
    { value: "rejected", label: bnEn("বাতিল", "Rejected") },
  ] }],
  fields: [
    { name: "studentName", label: bnEn("শিক্ষার্থীর নাম", "Student name"), type: "text", required: true, inTable: true, maxLength: 80 },
    { name: "dateOfBirth", label: bnEn("জন্মতারিখ", "Date of birth"), type: "date", required: true, inTable: true, tableAs: "date", hideOnMobile: true },
    { name: "gender", label: bnEn("লিঙ্গ", "Gender"), type: "select", required: true, options: GENDER_OPTIONS, inTable: true, tableAs: "badge", hideOnMobile: true },
    { name: "applyingClassId", label: bnEn("আবেদনকৃত শ্রেণি", "Applying class"), type: "select", required: true, source: CLASS_SOURCE, inTable: true },
    { name: "guardianName", label: bnEn("অভিভাবক", "Guardian"), type: "text", required: true, inTable: true, hideOnMobile: true, maxLength: 80 },
    { name: "guardianPhone", label: bnEn("মোবাইল", "Phone"), type: "text", required: true, inTable: true, maxLength: 20 },
    { name: "guardianEmail", label: bnEn("ইমেইল", "Email"), type: "text", maxLength: 120 },
    { name: "address", label: bnEn("ঠিকানা", "Address"), type: "textarea", span: 2, maxLength: 300 },
    { name: "previousSchool", label: bnEn("পূর্ববর্তী স্কুল", "Previous school"), type: "text", maxLength: 120 },
    { name: "note", label: bnEn("মন্তব্য", "Note"), type: "textarea", span: 2, maxLength: 500 },
    { name: "status", label: bnEn("অবস্থা", "Status"), type: "select", required: true, inTable: true, tableAs: "badge", options: [
      { value: "pending", label: bnEn("অপেক্ষমাণ", "Pending") },
      { value: "shortlisted", label: bnEn("বাছাইকৃত", "Shortlisted") },
      { value: "admitted", label: bnEn("ভর্তি", "Admitted") },
      { value: "rejected", label: bnEn("বাতিল", "Rejected") },
    ], defaultValue: "pending" },
    { name: "source", label: bnEn("উৎস", "Source"), type: "select", readOnly: true, options: [
      { value: "public-website", label: bnEn("ওয়েবসাইট", "Website") },
      { value: "office", label: bnEn("অফিস", "Office") },
    ] },
  ],
};

export const contactMessagesModule: ModuleDefinition = {
  id: "contactMessages",
  collection: "contactMessages",
  title: bnEn("যোগাযোগ বার্তা", "Contact messages"),
  capability: "admissions.review",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["name", "subject", "message", "email", "phone"],
  orderBy: [["createdAt", "desc"]],
  filters: [{ field: "status", label: bnEn("অবস্থা", "Status"), options: [
    { value: "new", label: bnEn("নতুন", "New") },
    { value: "read", label: bnEn("পড়া", "Read") },
    { value: "closed", label: bnEn("বন্ধ", "Closed") },
  ] }],
  fields: [
    { name: "name", label: bnEn("নাম", "Name"), type: "text", required: true, inTable: true, maxLength: 80 },
    { name: "email", label: bnEn("ইমেইল", "Email"), type: "text", inTable: true, hideOnMobile: true, maxLength: 120 },
    { name: "phone", label: bnEn("মোবাইল", "Phone"), type: "text", inTable: true, hideOnMobile: true, maxLength: 20 },
    { name: "subject", label: bnEn("বিষয়", "Subject"), type: "text", required: true, inTable: true, maxLength: 120 },
    { name: "message", label: bnEn("বার্তা", "Message"), type: "textarea", required: true, span: 2, maxLength: 1500 },
    { name: "status", label: bnEn("অবস্থা", "Status"), type: "select", required: true, inTable: true, tableAs: "badge", options: [
      { value: "new", label: bnEn("নতুন", "New") },
      { value: "read", label: bnEn("পড়া", "Read") },
      { value: "closed", label: bnEn("বন্ধ", "Closed") },
    ], defaultValue: "new" },
  ],
};


/* ---------------------------------- Exams ---------------------------------- */

const GRADING_SOURCE = { collection: "gradingRules" as const, labelEn: "name", orderBy: [["name", "asc"] as [string, "asc"]] };

export const examsModule: ModuleDefinition = {
  id: "exams",
  collection: "exams",
  title: bnEn("পরীক্ষা ব্যবস্থাপনা", "Examination management"),
  capability: "exams.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["name", "nameBn", "category"],
  orderBy: [["startDate", "desc"]],
  filters: [{ field: "publicationStatus", label: bnEn("অবস্থা", "Status"), options: PUBLICATION_OPTIONS }],
  fields: [
    { name: "name", label: bnEn("নাম (ইংরেজি)", "Name (English)"), type: "text", required: true, inTable: true, maxLength: 120 },
    { name: "nameBn", label: bnEn("নাম (বাংলা)", "Name (Bengali)"), type: "text", inTable: true, tableAs: "bilingual", maxLength: 120 },
    { name: "category", label: bnEn("ধরন", "Category"), type: "select", required: true, inTable: true, tableAs: "badge", options: [
      { value: "weekly", label: bnEn("সাপ্তাহিক", "Weekly") },
      { value: "term", label: bnEn("সাময়িক", "Term") },
      { value: "final", label: bnEn("বার্ষিক", "Final") },
      { value: "model", label: bnEn("মডেল", "Model test") },
    ] },
    { name: "academicSessionId", label: bnEn("শিক্ষাবর্ষ", "Session"), type: "select", required: true, source: SESSION_SOURCE, inTable: true, hideOnMobile: true },
    { name: "classIds", label: bnEn("শ্রেণি (কমা দিয়ে)", "Classes (comma separated)"), type: "multiselect", span: 2 },
    { name: "startDate", label: bnEn("শুরুর তারিখ", "Start date"), type: "date", required: true, inTable: true, tableAs: "date" },
    { name: "endDate", label: bnEn("শেষ তারিখ", "End date"), type: "date", required: true, inTable: true, tableAs: "date", hideOnMobile: true },
    { name: "gradingRuleId", label: bnEn("গ্রেডিং নিয়ম", "Grading rule"), type: "select", required: true, source: GRADING_SOURCE },
    { name: "publicationStatus", label: bnEn("প্রকাশের অবস্থা", "Publication status"), type: "select", required: true, options: PUBLICATION_OPTIONS, inTable: true, tableAs: "badge", defaultValue: "draft" },
  ],
};

/* --------------------------------- Invoices -------------------------------- */

export const invoicesModule: ModuleDefinition = {
  id: "invoices",
  collection: "invoices",
  title: bnEn("চালান", "Invoices"),
  capability: "fees.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["period", "feeType", "studentId"],
  orderBy: [["createdAt", "desc"]],
  filters: [{ field: "status", label: bnEn("অবস্থা", "Status"), options: [
    { value: "unpaid", label: bnEn("অপরিশোধিত", "Unpaid") },
    { value: "partial", label: bnEn("আংশিক", "Partial") },
    { value: "paid", label: bnEn("পরিশোধিত", "Paid") },
    { value: "overdue", label: bnEn("সময়োত্তীর্ণ", "Overdue") },
    { value: "waived", label: bnEn("মওকুফ", "Waived") },
  ] }],
  fields: [
    { name: "studentId", label: bnEn("শিক্ষার্থী", "Student"), type: "select", required: true, source: STUDENT_SOURCE, inTable: true },
    { name: "feeType", label: bnEn("ফির ধরন", "Fee type"), type: "select", required: true, inTable: true, tableAs: "badge", options: [
      { value: "tuition", label: bnEn("মাসিক বেতন", "Tuition") },
      { value: "admission", label: bnEn("ভর্তি ফি", "Admission") },
      { value: "exam", label: bnEn("পরীক্ষা ফি", "Exam") },
      { value: "transport", label: bnEn("পরিবহন", "Transport") },
      { value: "other", label: bnEn("অন্যান্য", "Other") },
    ] },
    { name: "period", label: bnEn("সময়কাল", "Period"), type: "text", required: true, inTable: true, maxLength: 20, hint: bnEn("যেমন 2026-01", "e.g. 2026-01") },
    { name: "amountPaisa", label: bnEn("পরিমাণ (পয়সা)", "Amount (paisa)"), type: "number", required: true, min: 0, inTable: true, tableAs: "money" },
    { name: "discountPaisa", label: bnEn("ছাড় (পয়সা)", "Discount (paisa)"), type: "number", min: 0, inTable: true, tableAs: "money" },
    { name: "dueDate", label: bnEn("পরিশোধের শেষ তারিখ", "Due date"), type: "date", required: true, inTable: true, tableAs: "date" },
    { name: "academicSessionId", label: bnEn("শিক্ষাবর্ষ", "Session"), type: "select", required: true, source: SESSION_SOURCE },
    { name: "paidAmountPaisa", label: bnEn("পরিশোধিত", "Paid"), type: "number", readOnly: true },
    { name: "dueAmountPaisa", label: bnEn("বকেয়া", "Due"), type: "number", readOnly: true },
    { name: "status", label: bnEn("অবস্থা", "Status"), type: "select", readOnly: true },
  ],
  onCreate: (values) => {
    const amount = Number(values.amountPaisa) || 0;
    const discount = Math.min(amount, Number(values.discountPaisa) || 0);
    return { ...values, paidAmountPaisa: 0, dueAmountPaisa: amount - discount, status: "unpaid" };
  },
};

/* --------------------------------- Payroll --------------------------------- */

export const salaryModule: ModuleDefinition = {
  id: "salaryRecords",
  collection: "salaryRecords",
  title: bnEn("বেতন রেকর্ড", "Salary records"),
  capability: "payroll.view",
  pageSize: 10,
  allowDelete: true,
  allowExport: true,
  searchFields: ["staffId", "monthKey"],
  orderBy: [["monthKey", "desc"]],
  fields: [
    { name: "staffId", label: bnEn("কর্মী", "Staff"), type: "select", required: true, inTable: true, source: { collection: "staff", labelEn: "name", labelBn: "nameBn", orderBy: [["name", "asc"]] } },
    { name: "monthKey", label: bnEn("মাস (YYYY-MM)", "Month (YYYY-MM)"), type: "text", required: true, inTable: true, maxLength: 7 },
    { name: "basicPaisa", label: bnEn("মূল বেতন (পয়সা)", "Basic (paisa)"), type: "number", required: true, min: 0, inTable: true, tableAs: "money" },
    { name: "allowancesPaisa", label: bnEn("ভাতা (পয়সা)", "Allowances (paisa)"), type: "number", min: 0, inTable: true, tableAs: "money" },
    { name: "deductionsPaisa", label: bnEn("কর্তন (পয়সা)", "Deductions (paisa)"), type: "number", min: 0, inTable: true, tableAs: "money" },
    { name: "netPaisa", label: bnEn("প্রদেয় (পয়সা)", "Net (paisa)"), type: "number", readOnly: true },
    { name: "status", label: bnEn("অবস্থা", "Status"), type: "select", required: true, inTable: true, tableAs: "badge", options: [
      { value: "draft", label: bnEn("খসড়া", "Draft") },
      { value: "paid", label: bnEn("পরিশোধিত", "Paid") },
    ], defaultValue: "draft" },
    { name: "paidAt", label: bnEn("পরিশোধের তারিখ", "Paid at"), type: "date" },
  ],
  onCreate: (values) => {
    const basic = Number(values.basicPaisa) || 0;
    const allowances = Number(values.allowancesPaisa) || 0;
    const deductions = Number(values.deductionsPaisa) || 0;
    return { ...values, netPaisa: basic + allowances - deductions };
  },
};

export const MODULES: Record<string, ModuleDefinition> = {
  students: studentsModule,
  teachers: teachersModule,
  staff: staffModule,
  classes: classesModule,
  sections: sectionsModule,
  subjects: subjectsModule,
  academicSessions: sessionsModule,
  notices: noticesModule,
  events: eventsModule,
  homework: homeworkModule,
  books: booksModule,
  transportRoutes: transportModule,
  vehicles: vehiclesModule,
  expenses: expensesModule,
  feeStructures: feeStructuresModule,
  galleryItems: galleryModule,
  testimonials: testimonialsModule,
  admissionApplications: admissionApplicationsModule,
  contactMessages: contactMessagesModule,
  exams: examsModule,
  invoices: invoicesModule,
  salaryRecords: salaryModule,
};

export const STUDENT_SOURCE_FOR_FORMS = STUDENT_SOURCE;
