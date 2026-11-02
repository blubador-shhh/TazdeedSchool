import { z } from "zod";
import type { CollectionName } from "@/types";
import type { WhereClause } from "@/lib/data/store";

export interface BilingualLabel {
  bn: string;
  en: string;
}

export type FieldType = "text" | "textarea" | "number" | "money" | "date" | "select" | "boolean" | "multiselect" | "bilingual-text";

export interface SelectOption {
  value: string;
  label: BilingualLabel;
}

export interface ModuleField {
  name: string;
  label: BilingualLabel;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: BilingualLabel;
  options?: SelectOption[];
  /** Dynamic options loaded from another collection (classes, subjects…). */
  source?: {
    collection: CollectionName;
    labelEn: string;
    labelBn?: string;
    valueField?: string;
    where?: WhereClause[];
    orderBy?: [string, "asc" | "desc"][];
  };
  min?: number;
  max?: number;
  maxLength?: number;
  /** Rendered in the data table. */
  inTable?: boolean;
  tableAs?: "text" | "badge" | "money" | "date" | "bilingual";
  hideOnMobile?: boolean;
  defaultValue?: unknown;
  /** Field kept out of the create/edit form (computed or system owned). */
  readOnly?: boolean;
  span?: 1 | 2;
}

export interface ModuleFilter {
  field: string;
  label: BilingualLabel;
  options: SelectOption[];
}

export interface ModuleDefinition {
  id: string;
  /** Fields that must stay unique inside the collection (checked before create). */
  unique?: string[];
  collection: CollectionName;
  title: BilingualLabel;
  description?: BilingualLabel;
  capability: string;
  fields: ModuleField[];
  searchFields: string[];
  filters?: ModuleFilter[];
  orderBy?: [string, "asc" | "desc"][];
  pageSize?: number;
  allowDelete?: boolean;
  allowCreate?: boolean;
  allowExport?: boolean;
  /** Extra values written on create (system-owned fields). */
  onCreate?: (values: Record<string, unknown>) => Record<string, unknown>;
  /** Deterministic document id (prevents duplicate records). */
  documentId?: (values: Record<string, unknown>) => string;
}

export type Row = { id: string } & Record<string, unknown>;

/** Builds a Zod schema from a module's field definitions. */
export function buildModuleSchema(fields: ModuleField[]): z.ZodType<Record<string, unknown>, Record<string, unknown>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    if (field.readOnly) continue;
    let schema: z.ZodTypeAny;

    switch (field.type) {
      case "number":
      case "money": {
        let numeric: z.ZodTypeAny = z.coerce.number();
        if (field.min !== undefined) numeric = z.coerce.number().min(field.min);
        if (field.max !== undefined) numeric = z.coerce.number().min(field.min ?? Number.NEGATIVE_INFINITY).max(field.max);
        schema = field.required ? numeric : z.union([numeric, z.literal(""), z.null()]);
        break;
      }
      case "boolean":
        schema = z.boolean().optional();
        break;
      case "select":
      case "multiselect": {
        let text = z.string().trim();
        if (field.required) text = text.min(1);
        if (field.maxLength) text = text.max(field.maxLength);
        schema = text;
        break;
      }
      case "date": {
        const text = z.string().trim();
        schema = field.required
          ? text.min(1).refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "date")
          : z.union([text, z.literal("")]);
        break;
      }
      default: {
        const text = z.string().trim().max(field.maxLength ?? 4000);
        schema = field.required ? text.min(1) : z.union([text, z.literal("")]);
      }
    }
    shape[field.name] = schema;
  }

  return z.object(shape as z.ZodRawShape) as unknown as z.ZodType<Record<string, unknown>, Record<string, unknown>>;
}

/** Converts raw form values into the shape stored in Firestore. */
export function normaliseValues(fields: ModuleField[], values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.readOnly) continue;
    const raw = values[field.name];
    switch (field.type) {
      case "number":
      case "money": {
        const numeric = raw === "" || raw === null || raw === undefined ? undefined : Number(raw);
        out[field.name] = numeric === undefined || Number.isNaN(numeric) ? null : numeric;
        break;
      }
      case "boolean":
        out[field.name] = Boolean(raw);
        break;
      case "multiselect":
        out[field.name] = String(raw ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
        break;
      default:
        out[field.name] = raw === undefined || raw === null ? "" : String(raw).trim();
    }
  }
  return out;
}

export function fieldValue(row: Row | null, name: string): unknown {
  return row ? row[name] : undefined;
}
