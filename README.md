# Tazdeed School — Public Website + School Management ERP

A bilingual (বাংলা / English) single-school website and role-based School Management ERP built with
**Next.js (App Router) + TypeScript (strict) + Tailwind CSS + Firebase Authentication + Cloud Firestore**.

The production target is a **static export** deployed to Firebase Hosting on the **Spark (free) plan**.
There is no Node.js server, no API route dependency, no Admin SDK, no Cloud Functions and no Cloud
Storage: the browser talks to Firebase directly, and **Cloud Firestore Security Rules are the only
authorization boundary**.

---

## 0. Reference images — honest status

The task referred to two attached images (the official logo and a full homepage design). **Neither
image was present in this repository** (`find . -iname "*.png|*.jpg"` returned nothing, and
`public/` did not exist). Nothing was invented and nothing was claimed to be inspected:

* **Logo** — a clean, brand-coloured vector mark is bundled at
  `public/images/tazdeed-school-logo.svg` as a *placeholder*. `src/components/layout/Logo.tsx`
  resolves, in order: `schoolSettings.logoUrl` → `public/images/tazdeed-school-logo.png` →
  `public/images/tazdeed-school-logo.svg` → an inline monogram tile. **Drop the official artwork at
  `public/images/tazdeed-school-logo.png` and it is used everywhere automatically** (header, footer,
  login, ID cards, marksheets, receipts, registers) with the aspect ratio preserved and a graceful
  fallback if it fails to load. No image is stretched, cropped or filtered.
* **Homepage** — rebuilt section-by-section as real components from the written design brief
  (§6 of the requirements): header + nav + language selector + login, bilingual hero with imagery
  and two CTAs, configurable statistics band, six feature cards, about + vision/mission, academic
  programmes, latest notices, upcoming events, gallery with lightbox, testimonials, admission CTA,
  footer. The reference screenshot is **not** used as a page background and no section is a flat
  picture.
* **Photography** — real school photographs were downloaded into `public/images/` (hero, campus,
  gallery) so the site does not depend on unverified third-party URLs. Replace them freely.

If you attach the two reference images, the logo and homepage can be matched pixel-for-pixel in a
follow-up pass.

---

## 1. What is implemented

### Public website (no login required)
`/` · `/about/` · `/academics/` · `/admission/` · `/facilities/` · `/notices/` · `/events/` ·
`/gallery/` · `/contact/` · `/login/`

* Bilingual UI with a language selector; the preference persists in `localStorage` for visitors and
  on the user profile (`preferredLanguage`) for staff/students/parents. Locale-aware dates and
  numbers (Bengali digits for `bn`).
* All homepage content is data-driven from `publicSiteContent` and `schoolSettings` — no invented
  contact details, statistics, testimonials or accreditation claims. Unconfigured statistics render
  as `—` with an instruction to fill them in Settings; unverified testimonials are only shown in the
  local demo fallback and are labelled `DEMO`.
* Public admission application and contact forms write directly to Firestore (create-only, strictly
  validated by rules — see §5).
* Gallery images are bundled static assets or validated `https://` URLs, with a lightbox
  (keyboard: ← → Esc) and attractive placeholders when an image is missing/unsafe.

### Secure ERP (`/dashboard/...`)
Role-aware navigation for **admin, teacher, accountant, librarian, student, parent**:

| Area | Route | Status |
|---|---|---|
| Overview per role (real Firestore aggregates, charts) | `/dashboard/` | ✅ working |
| Students: CRUD, search, filters, pagination, CSV export, **validated CSV import with preview + duplicate detection**, printable **student ID card** | `/dashboard/students/` | ✅ working |
| Teachers: CRUD, employee IDs, subject/class assignment, export | `/dashboard/teachers/` | ✅ working |
| Staff & HR directory | `/dashboard/staff/` | ✅ working |
| Users & roles: list, **provisioning without logging the admin out**, profile recovery, status/role edits (no admin creation) | `/dashboard/users/` | ✅ working |
| Academics: sessions, classes, sections, subjects | `/dashboard/academics/` | ✅ working |
| Attendance: class register, bulk marking, present/absent/late/leave, duplicate-proof ids, teacher-assignment enforcement, printable register | `/dashboard/attendance/` | ✅ working |
| Exams + marks entry (max/pass marks, absent flag, subject-scoped permissions) and **result generation** | `/dashboard/exams/` | ✅ working |
| Results: tabulation sheet, marksheet print (bn/en), merit positions, publish/unpublish | `/dashboard/results/` | ✅ working |
| Fees: fee structures, invoices, payments, **manual verification queue**, receipt numbering via transactional counters, printable receipts | `/dashboard/fees/` | ✅ working |
| Expenses | `/dashboard/expenses/` | ✅ working |
| Notices / Events / Homework (bilingual, draft→published, audience targeting) | `/dashboard/notices/`, `/dashboard/events/`, `/dashboard/homework/` | ✅ working |
| Library: catalogue, issue/return with availability guard, overdue + fines | `/dashboard/library/` | ✅ working |
| Transport: routes, stops, vehicles (no GPS claims) | `/dashboard/transport/` | ✅ working |
| Reports: attendance/finance/class/result charts, **CSV + JSON exports**, backup limitations | `/dashboard/reports/` | ✅ working |
| Settings: school info, public website content, **grading rules editor**, backup import/export | `/dashboard/settings/` | ✅ working |
| Profile: own details, language preference, student ID print, sign out | `/dashboard/profile/` | ✅ working |

Business logic (grading/GPA/merit, paisa money maths, invoice reconciliation, dates, CSV,
validators, capability matrix) lives in `src/lib/**` and is covered by **47 passing unit tests**.

### Deliberately not implemented (documented, not faked)
* **No file uploads** — Firebase Storage is prohibited. Homework/submissions accept text and
  validated external `https://` links only; the UI says so.
* **No payment gateway** — bKash/Nagad/Rocket/bank references are recorded as **unverified** until
  an authorized staff member verifies them. Nothing is claimed to be auto-verified.
* **No email/SMS delivery, no server-side PDF** — printing uses the browser's Print → Save as PDF.
* **No GPS vehicle tracking, no automated payroll banking.**
* **Inventory module** is not shipped in this pass (schema/collection names are reserved);
  HR/payroll is implemented as `salaryRecords` (admin/accountant only) without banking integration.
* Homework **submissions UI** (student text submission + teacher feedback) has rules, types and
  collection support; the student-facing submit screen is the next increment.

---

## 2. Local fallback ("Demo mode") — what it is and is not

If no Firebase web config is present, the app runs against a **browser-localStorage driver** and
every screen shows a clear amber **Demo mode** banner. Fixtures (`src/lib/data/seed.ts`) are written
**only** to that local driver — never to Cloud Firestore — and every row carries
`isDemoFixture: true`. Demo logins (admin/teacher/accountant/librarian/student/parent) are listed on
the login screen so the ERP can be exercised end to end. Once the Firebase config is supplied, the
Firestore driver is used automatically and the demo data/banner disappears.

Set `NEXT_PUBLIC_ENABLE_LOCAL_FALLBACK=false` to refuse the fallback entirely.

---

## 3. Requirements

* Node.js **20.9+ / 22+** (the Firebase SDK warns that it prefers Node ≥ 24; it works on 22)
* npm 10+
* A Firebase project on the **Spark** plan
* For rules tests only: Java 11+ and `firebase-tools` (`npm i -g firebase-tools`)

---

## 4. Firebase project setup (exact steps)

1. **Create the project** — <https://console.firebase.google.com> → *Add project* →
   name it (e.g. `tazdeed-school`). No billing account is required.
2. **Register a Web app** — Project settings → *General* → *Your apps* → `</>` → register.
   Copy the `firebaseConfig` values into `.env.local` (see `.env.example`).
3. **Enable Authentication** — Build → Authentication → *Get started* → **Email/Password** → Enable.
   (No other provider is needed.)
4. **Create Cloud Firestore** — Build → Firestore Database → *Create database* → production mode →
   choose a region (e.g. `asia-south1`).
5. **Configure the school identifier** — keep `NEXT_PUBLIC_SCHOOL_ID` identical to the value used in
   `firestore.rules` (`schoolId()` currently returns `tazdeed-school`). Change both if you rename it.
6. **Deploy rules and indexes**

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add          # select the project; alias it e.g. "tazdeed"
   firebase deploy --only firestore:rules,firestore:indexes,hosting
   ```

   > `firebase.json` points Hosting at `out/` (the static export) and Firestore at
   > `firestore.rules` + `firestore.indexes.json`.

### 4.1 Create the first administrator (manual, by design)

There is **no public registration** and the UI can never create an administrator.

1. Authentication → *Users* → **Add user** → e.g. `admin@tazdeed.school` with a strong password.
2. Copy that user's **UID**.
3. Firestore → *Start collection* `users` → **Document ID = the UID** → fields:

   | Field | Type | Value |
   |---|---|---|
   | `uid` | string | *the same UID* |
   | `schoolId` | string | `tazdeed-school` |
   | `email` | string | `admin@tazdeed.school` |
   | `displayName` | string | `School Administrator` |
   | `displayNameBn` | string | `স্কুল প্রশাসক` |
   | `role` | string | `admin` |
   | `status` | string | `active` |
   | `preferredLanguage` | string | `bn` |
   | `guardianStudentIds` | array | *(empty)* |
   | `createdAt` / `updatedAt` | string | ISO-8601 timestamp |

4. Sign in at `/login/`. You should land on `/dashboard/` with the full admin navigation.
   If you see “no school profile”, the document id does not match the UID.

All later accounts (teacher, accountant, librarian, student, parent) are created from
**Dashboard → Users & Roles**, which uses a *separate named Firebase app instance* so the admin
session is not lost. If the profile write fails, the screen reports it honestly and offers
**Recover profile** (writes `/users/{uid}` for an existing Authentication account).

### 4.2 Seed the school configuration

Sign in as admin and open **Settings**: save *School information* (creates
`schoolSettings/tazdeed-school`) and *Public website content* (creates `publicSiteContent/home`),
then add at least one **grading rule** (Settings → Grading rules) and the academic structure
(Academics → sessions/classes/sections/subjects). Until then the public site shows neutral
placeholders instead of invented facts.

---

## 5. Security model

* `firestore.rules` starts from **default deny** (`match /{document=**} { allow read, write: if false; }`)
  and re-derives `role`, `status` and `schoolId` from `/users/{uid}` on every request — client-sent
  values are never trusted.
* Highlights:
  * A user may only change their **own** `displayName`, `displayNameBn`, `phone`, `photoUrl`,
    `preferredLanguage`. `role`, `status`, `schoolId`, `uid`, `studentId`, `teacherId` and
    `guardianStudentIds` are protected → **no privilege escalation**.
  * Administrators may create accounts only for `teacher|accountant|librarian|student|parent`
    (creating a second admin through the ordinary path is denied).
  * Students read only their own records; parents only linked children (guessing a document id
    fails); teachers only their assigned classes/subjects; accountants cannot touch marks/results;
    teachers/students/parents cannot read invoices ledger-write, payroll or expenses.
  * Students/parents see results **only when `publicationStatus == "published"`**.
  * Invoices/payments may only be written by admin/accountant; unverified mobile-banking references
    can never settle an invoice (`verifiedPaidPaisa` counts verified rows only).
  * Public visitors may read published public notices/events/gallery and school settings, and may
    **create** admission applications / contact messages with a fixed `status`, fixed `source`,
    field allow-list and phone regex — they can never read, update or approve them.
  * `auditLogs` is append-only (`actorUid == request.auth.uid`, no update/delete).
* `firestore.indexes.json` declares the 44 composite indexes used by the queries above
  (`schoolId` + filter + sort), so no query silently fails with `failed-precondition` in production.

---

## 6. Development

```bash
npm install
cp .env.example .env.local        # fill in the Firebase web config
npm run dev                       # http://localhost:3000
```

Builds:

```bash
npm run build                     # normal Next build (used by the sandbox preview)
NEXT_STATIC_EXPORT=1 npm run build   # static export into ./out for Firebase Hosting
npx firebase emulators:start --only hosting,firestore,auth   # serve ./out locally
```

`next.config.ts` enables `output: "export"`, `trailingSlash: true` and
`images.unoptimized` only when `NEXT_STATIC_EXPORT=1`, so the same repository also runs in a Node
preview harness. **No dynamic route segments are used** (detail views are dialogs / query strings),
therefore direct navigation and browser refresh work on a plain static host.

Tests:

```bash
npx vitest run tests/unit      # 47 tests — grading, money, dates, CSV, validators, RBAC
npx vitest run                 # unit + security (security suite skips without the emulator)

# Full rules verification against the emulator (requires firebase-tools + Java):
npx firebase emulators:exec --only firestore,auth \
  "FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx vitest run tests/security"
```

`tests/security/firestore.rules.test.ts` covers 16 scenarios (unauthenticated access, disabled
accounts, cross-school access, student/parent ownership, teacher class + finance isolation,
accountant restrictions, invoice settlement by unauthorized roles, privilege escalation,
public notice visibility, public admission create/read/approve, payroll isolation, published-only
results, librarian bounds, admin rights). **They are skipped unless the emulator is reachable** —
run the command above before a production release and treat a failing run as a release blocker.

---

## 7. Free-tier (Spark) operating notes

* Reads are bounded everywhere: paginated queries (`limit` + `offset`), equality filters on
  `schoolId`, dashboards capped at 500 documents, no standing real-time listeners on large
  collections, and `schoolSettings`/`publicSiteContent` are cached per session.
* Writes are batched (≤ 200 per Firestore batch) and use deterministic document ids for attendance
  (`att-{date}-{studentId}`), marks (`mk-{exam}-{student}-{subject}`) and results
  (`res-{exam}-{student}`) so re-submission cannot create duplicates. Receipt numbers come from a
  transactional counter (`counters/receipts-{year}`).
* **The Spark plan is not unlimited.** Daily Firestore read/write/document limits and
  Authentication quotas apply; if they are exceeded, operations fail until the quota resets. Monitor
  usage in the Firebase console (Firestore → Usage) and in Authentication → Usage. This project
  never upgrades the plan or links billing on your behalf.
* Hosting caches `_next/static` and images for one year and revalidates HTML/JSON immediately.

## 8. Backup and export

* **Reports → Backup & export** downloads CSV or JSON for the collections the signed-in role may
  read (students, teachers, classes, attendance, results, invoices, payments, expenses, notices),
  each capped at 500 documents.
* **Settings → Backup** exports/imports the configuration bundle (school settings, site content,
  grading rules).
* A browser export is **not** a consistent full-database snapshot. Verify exports periodically and
  keep copies outside the browser. Native scheduled Firestore export requires the Blaze plan and is
  intentionally not used here.

## 9. Replacing static assets

| Path | Purpose |
|---|---|
| `public/images/tazdeed-school-logo.png` | **official logo** (drop-in, highest priority after settings) |
| `public/images/tazdeed-school-logo.svg` | vector fallback (bundled) |
| `public/images/hero/hero-classroom.jpg` | homepage hero |
| `public/images/school/*.jpg` | about/campus imagery |
| `public/images/gallery/*.jpg` | bundled gallery photos |

Keep file names (or point `schoolSettings.logoUrl` / gallery `imageUrl` at a validated `https://`
URL). Only `https://` and `/images/…` values are accepted — `javascript:`, `data:` and other schemes
are rejected by `src/lib/validators`.

## 10. Project layout

```
firestore.rules  firestore.indexes.json  firebase.json  vitest.config.ts  .env.example
public/images/{logo,hero,school,gallery}
src/
  app/(public)/{page,about,academics,admission,facilities,notices,events,gallery,contact,login}
  app/dashboard/{page,students,teachers,staff,users,academics,attendance,exams,results,
                 fees,expenses,notices,events,homework,library,transport,reports,settings,profile}
  components/{ui,layout,homepage,public,dashboard,print}
  features/{auth,settings,crud,modules,dashboard,results}
  hooks/{useCollection,useLookups}
  lib/{firebase,data,i18n,permissions,academics,validators,utils}
  messages/{bn.json,en.json}   types/index.ts
tests/unit/*  tests/security/firestore.rules.test.ts
```

## 11. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Amber “Demo mode” banner | No Firebase web config → fill `.env.local`, restart `npm run dev` |
| `auth/operation-not-allowed` | Email/Password sign-in not enabled in Authentication |
| “no school profile” after login | `/users/{uid}` missing or its id ≠ the Authentication UID |
| `permission-denied` everywhere for a new admin | `role`, `status` or `schoolId` wrong in `/users/{uid}` |
| `failed-precondition` on a query | Composite index missing → `firebase deploy --only firestore:indexes` |
| Blank statistics on the homepage | Values not set in Settings → Public website content (never hardcoded) |
| Logo looks wrong | Put the official PNG at `public/images/tazdeed-school-logo.png` (see §9) |
| `resource-exhausted` | Spark daily quota reached — wait for reset, review usage |

## 12. Note on this repository's sandbox files

`src/db/*`, `drizzle.config.json` and `src/app/api/health/route.ts` belong to the sandbox preview
harness (it probes `/api/health`). The application itself never imports them; in a real deployment
you can delete them together with the `pg`/`drizzle-*` dependencies. `/api/health` is declared
`force-static`, so it does not break `output: "export"`.
