import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  formatDate,
  formatNumber,
  isPast,
  isUpcoming,
  isWithinRange,
  lastNDays,
  monthKey,
  parseDateKey,
  toDateKey,
  todayKey,
} from "@/lib/utils/date";
import { csvToObjects, parseCsv, previewImport, toCsv, chunk } from "@/lib/utils/csv";
import { isSafeImageUrl, isSafeLinkUrl, isBangladeshiPhone, isValidEmail, toDocumentId } from "@/lib/validators";
import { PROVISIONABLE_ROLES, ROLE_CAPABILITIES, assertCan, can, isProvisionableRole } from "@/lib/permissions";

describe("school-local dates", () => {
  it("formats YYYY-MM-DD keys and parses them back", () => {
    const date = new Date(2026, 0, 9);
    expect(toDateKey(date)).toBe("2026-01-09");
    expect(parseDateKey("2026-01-09")?.getFullYear()).toBe(2026);
    expect(parseDateKey("not-a-date")).toBeNull();
    expect(monthKey(new Date(2026, 6, 4))).toBe("2026-07");
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("adds days and measures ranges", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
    expect(daysBetween("2026-01-01", "2026-01-11")).toBe(10);
    expect(daysBetween("2026-01-11", "2026-01-01")).toBe(-10);
    expect(isWithinRange("2026-02-05", "2026-02-01", "2026-02-28")).toBe(true);
    expect(isWithinRange("2026-03-05", "2026-02-01", "2026-02-28")).toBe(false);
  });

  it("never labels a past event as upcoming", () => {
    const now = new Date(2026, 4, 20, 9, 0, 0);
    expect(isUpcoming("2026-05-20", now)).toBe(true); // same day, until midnight
    expect(isUpcoming("2026-05-21", now)).toBe(true);
    expect(isUpcoming("2026-05-19", now)).toBe(false);
    expect(isPast("2026-05-19", now)).toBe(true);
    expect(isPast("2026-05-20", now)).toBe(false);
  });

  it("returns the last n day keys, oldest first", () => {
    const days = lastNDays(3, new Date(2026, 0, 10));
    expect(days).toEqual(["2026-01-08", "2026-01-09", "2026-01-10"]);
  });

  it("formats dates and numbers for both locales", () => {
    expect(formatDate("2026-01-09", "en")).toMatch(/2026/);
    expect(formatDate("2026-01-09", "bn")).toMatch(/[০-৯]/); // Bengali digits
    expect(formatNumber(1234, "en")).toBe("1,234");
    expect(formatNumber(1234, "bn")).toMatch(/[০-৯]/);
    expect(formatDate(null, "en")).toBe("—");
  });
});

describe("csv helpers", () => {
  it("round-trips quoted cells, commas and newlines", () => {
    const csv = toCsv(
      [
        { name: 'Ayesha, "A"', note: "line1\nline2", roll: 3 },
        { name: "Tanvir", note: "", roll: 4 },
      ],
      [
        { key: "name", header: "Name", value: (row) => row.name },
        { key: "note", header: "Note", value: (row) => row.note },
        { key: "roll", header: "Roll", value: (row) => row.roll },
      ],
    );
    const rows = csvToObjects(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].Name).toBe('Ayesha, "A"');
    expect(rows[0].Note).toBe("line1\nline2");
    expect(rows[1].Roll).toBe("4");
  });

  it("parses CRLF files and strips a BOM", () => {
    expect(parseCsv("\uFEFFa,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("validates imports and detects duplicates against existing keys", () => {
    const preview = previewImport<{ admissionNo: string; name: string }>(
      [
        { admissionNo: "TZD-1", name: "A" },
        { admissionNo: "", name: "B" },
        { admissionNo: "TZD-1", name: "C" },
        { admissionNo: "TZD-2", name: "D" },
        { admissionNo: "TZD-3", name: "E" },
      ],
      (record, row) =>
        record.admissionNo && record.name
          ? { value: { admissionNo: record.admissionNo, name: record.name } }
          : { error: `Row ${row}: admissionNo and name are required` },
      (value) => value.admissionNo,
      ["TZD-3"],
    );
    expect(preview.valid.map((row) => row.admissionNo)).toEqual(["TZD-1", "TZD-2"]);
    expect(preview.issues).toHaveLength(1);
    expect(preview.duplicates).toHaveLength(2); // in-file duplicate + existing key
    expect(preview.totalRows).toBe(5);
  });

  it("chunks imports into bounded batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 10)).toEqual([]);
  });
});

describe("input validators", () => {
  it("accepts only bundled assets and https images", () => {
    expect(isSafeImageUrl("/images/gallery/a.jpg")).toBe(true);
    expect(isSafeImageUrl("https://example.com/photo.png")).toBe(true);
    expect(isSafeImageUrl("http://example.com/photo.png")).toBe(false);
    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeImageUrl("data:text/html;base64,AAA")).toBe(false);
    expect(isSafeImageUrl("https://example.com/page")).toBe(false);
    expect(isSafeImageUrl("")).toBe(false);
  });

  it("accepts https, mailto and tel links only", () => {
    expect(isSafeLinkUrl("https://maps.google.com/?q=school")).toBe(true);
    expect(isSafeLinkUrl("mailto:office@tazdeed.school")).toBe(true);
    expect(isSafeLinkUrl("tel:+8801700000000")).toBe(true);
    expect(isSafeLinkUrl("javascript:void(0)")).toBe(false);
    expect(isSafeLinkUrl("ftp://example.com")).toBe(false);
  });

  it("validates Bangladeshi mobile numbers and emails", () => {
    expect(isBangladeshiPhone("01712345678")).toBe(true);
    expect(isBangladeshiPhone("+8801712345678")).toBe(true);
    expect(isBangladeshiPhone("01212345678")).toBe(false);
    expect(isValidEmail("office@tazdeed.school")).toBe(true);
    expect(isValidEmail("office@tazdeed")).toBe(false);
  });

  it("builds firestore-safe document ids", () => {
    expect(toDocumentId("Class 10 / A")).toBe("class-10-a");
    expect(toDocumentId("  __  ")).toBe("");
  });
});

describe("role based access control", () => {
  it("gives administrators every capability", () => {
    expect(can("admin", "settings.manage")).toBe(true);
    expect(can("admin", "results.publish")).toBe(true);
  });

  it("keeps teachers out of finance, users and settings", () => {
    expect(can("teacher", "fees.view")).toBe(false);
    expect(can("teacher", "expenses.manage")).toBe(false);
    expect(can("teacher", "users.provision")).toBe(false);
    expect(can("teacher", "settings.manage")).toBe(false);
    expect(can("teacher", "results.publish")).toBe(false);
    expect(can("teacher", "attendance.mark")).toBe(true);
  });

  it("keeps accountants out of academics", () => {
    expect(can("accountant", "marks.enter")).toBe(false);
    expect(can("accountant", "results.publish")).toBe(false);
    expect(can("accountant", "fees.verify")).toBe(true);
    expect(can("accountant", "students.manage")).toBe(false);
  });

  it("limits students and parents to their own records", () => {
    expect(can("student", "students.view")).toBe(false);
    expect(can("student", "students.viewOwn")).toBe(true);
    expect(can("student", "results.viewOwn")).toBe(true);
    expect(can("student", "results.view")).toBe(false);
    expect(can("parent", "fees.viewOwn")).toBe(true);
    expect(can("parent", "fees.manage")).toBe(false);
    expect(can("librarian", "library.manage")).toBe(true);
    expect(can("librarian", "payroll.view")).toBe(false);
  });

  it("denies anonymous users everything", () => {
    expect(can(null, "dashboard.view")).toBe(false);
    expect(can(undefined, "students.viewOwn")).toBe(false);
  });

  it("never allows provisioning another administrator", () => {
    expect(isProvisionableRole("admin")).toBe(false);
    expect(PROVISIONABLE_ROLES).not.toContain("admin");
    expect(isProvisionableRole("teacher")).toBe(true);
    expect(() => assertCan("student", "settings.manage")).toThrow();
    expect(() => assertCan("admin", "settings.manage")).not.toThrow();
  });

  it("defines a capability list for every role", () => {
    (Object.keys(ROLE_CAPABILITIES) as (keyof typeof ROLE_CAPABILITIES)[]).forEach((role) => {
      expect(ROLE_CAPABILITIES[role]).toContain("dashboard.view");
    });
  });
});
