/**
 * CSV / JSON export + import helpers (browser only — no paid backup service).
 *
 * Exports are limited to rows the signed-in user is allowed to read; imports
 * are validated row by row and previewed before anything is written.
 */

export interface CsvColumn<T> {
  key: string;
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((column) => escapeCell(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(","));
  return [header, ...body].join("\r\n");
}

/** RFC4180-ish parser: quoted fields, escaped quotes, CRLF and LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\r") continue;
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? "").trim();
    });
    return record;
  });
}

export interface ImportIssue {
  row: number;
  message: string;
}

export interface ImportPreview<T> {
  valid: T[];
  issues: ImportIssue[];
  duplicates: ImportIssue[];
  totalRows: number;
}

/**
 * Validate parsed rows with a per-row schema, detecting duplicates by key.
 * Nothing is written to Firestore until the admin confirms the preview.
 */
export function previewImport<T>(
  records: Record<string, string>[],
  validateRow: (record: Record<string, string>, rowIndex: number) => { value?: T; error?: string },
  duplicateKey: (value: T) => string,
  existingKeys: string[] = [],
): ImportPreview<T> {
  const preview: ImportPreview<T> = { valid: [], issues: [], duplicates: [], totalRows: records.length };
  const seen = new Set<string>(existingKeys);

  records.forEach((record, index) => {
    const rowNumber = index + 2; // header is row 1
    const result = validateRow(record, rowNumber);
    if (result.error || result.value === undefined) {
      preview.issues.push({ row: rowNumber, message: result.error ?? "Invalid row." });
      return;
    }
    const key = duplicateKey(result.value);
    if (seen.has(key)) {
      preview.duplicates.push({ row: rowNumber, message: `Duplicate value "${key}" — row skipped.` });
      return;
    }
    seen.add(key);
    preview.valid.push(result.value);
  });

  return preview;
}

export function downloadFile(filename: string, content: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  downloadFile(filename, toCsv(rows, columns), "text/csv");
}

export function downloadJson(filename: string, data: unknown) {
  downloadFile(filename, JSON.stringify(data, null, 2), "application/json");
}

/** Firestore batch limit is 500 writes — chunk imports well below that. */
export function chunk<T>(items: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
