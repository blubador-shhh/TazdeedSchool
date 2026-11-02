import {
  collection,
  deleteDoc as fsDeleteDoc,
  doc,
  getDoc as fsGetDoc,
  getDocs,
  limit as fsLimit,
  orderBy as fsOrderBy,
  query as fsQuery,
  runTransaction,
  setDoc,
  updateDoc as fsUpdateDoc,
  where as fsWhere,
  writeBatch,
  type WhereFilterOp,
} from "firebase/firestore";
import { DATA_MODE, getFirebaseDb, SCHOOL_ID } from "@/lib/firebase/client";
import { makeId } from "@/lib/utils/cn";
import type { CollectionName } from "@/types";

/**
 * Data access layer.
 *
 * One repository API, two interchangeable drivers:
 *  - `firestore` → Cloud Firestore through the client SDK (production)
 *  - `local`     → browser localStorage fallback used **only** while no
 *                  Firebase project is configured. The UI labels this
 *                  "Demo mode" and never claims the data is persisted.
 *
 * Spark-plan efficiency rules:
 *  - every query is scoped by `schoolId` and paginated with `limit`
 *  - no unbounded collection reads, no standing listeners on large collections
 *  - counters (receipt numbers) use a transaction so they stay unique
 */

export type WhereOp = "==" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "array-contains";
export type WhereClause = [field: string, op: WhereOp, value: unknown];

export interface QueryOptions {
  where?: WhereClause[];
  orderBy?: [field: string, direction: "asc" | "desc"][];
  limit?: number;
  offset?: number;
  /** Case-insensitive substring match applied to the fetched page. */
  search?: string;
  searchFields?: string[];
  /** Skip the automatic `schoolId == SCHOOL_ID` scope (public reads). */
  noSchoolScope?: boolean;
}

export interface ListResult<T> {
  rows: T[];
  total: number;
  hasMore: boolean;
}

export interface Driver {
  list<T>(name: CollectionName, options?: QueryOptions): Promise<ListResult<T>>;
  get<T>(name: CollectionName, id: string): Promise<T | null>;
  create<T extends object>(name: CollectionName, data: T, id?: string): Promise<string>;
  update(name: CollectionName, id: string, patch: Record<string, unknown>): Promise<void>;
  remove(name: CollectionName, id: string): Promise<void>;
  bulkCreate<T extends object>(name: CollectionName, rows: T[]): Promise<number>;
  nextSequence(counterName: string): Promise<number>;
}

type Row = Record<string, unknown>;

function nowIso(): string {
  return new Date().toISOString();
}

function matchesSearch(row: Row, search: string, fields: string[]): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => String(row[field] ?? "").toLowerCase().includes(needle));
}

function compareValues(a: unknown, b: unknown, direction: "asc" | "desc"): number {
  const av = a ?? "";
  const bv = b ?? "";
  let result: number;
  if (typeof av === "number" && typeof bv === "number") result = av - bv;
  else result = String(av).localeCompare(String(bv), "en", { numeric: true });
  return direction === "desc" ? -result : result;
}

function paginate<T>(rows: T[], options: QueryOptions): ListResult<T> {
  const total = rows.length;
  const start = options.offset ?? 0;
  const end = options.limit ? start + options.limit : undefined;
  return { rows: rows.slice(start, end), total, hasMore: end !== undefined && end < total };
}

function applySearchAndSort<T>(rows: T[], options: QueryOptions): T[] {
  let out = rows;
  if (options.search && options.searchFields?.length) {
    out = out.filter((row) => matchesSearch(row as unknown as Row, options.search!, options.searchFields!));
  }
  const ordering = options.orderBy ?? [];
  if (ordering.length > 0) {
    out = [...out].sort((a, b) => {
      for (const [field, direction] of ordering) {
        const result = compareValues((a as Row)[field], (b as Row)[field], direction);
        if (result !== 0) return result;
      }
      return 0;
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Local (browser) driver — development / demo fallback
 * ------------------------------------------------------------------ */

const LOCAL_KEY = "tazdeed.local.v1";

type LocalDb = Record<string, Record<string, Row>>;

function readLocalDb(): LocalDb {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as LocalDb) : {};
  } catch {
    return {};
  }
}

function writeLocalDb(db: LocalDb): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(db));
  } catch {
    /* storage full or blocked — the UI reports the failure on next read */
  }
}

function matchesWhere(row: Row, clause: WhereClause): boolean {
  const [field, op, value] = clause;
  const actual = row[field];
  switch (op) {
    case "==":
      return actual === value;
    case "!=":
      return actual !== value;
    case "<":
      return Number(actual) < Number(value);
    case "<=":
      return Number(actual) <= Number(value);
    case ">":
      return Number(actual) > Number(value);
    case ">=":
      return Number(actual) >= Number(value);
    case "in":
      return Array.isArray(value) && value.includes(actual);
    case "array-contains":
      return Array.isArray(actual) && actual.includes(value);
    default:
      return true;
  }
}

export const localDriver: Driver = {
  async list<T>(name: CollectionName, options: QueryOptions = {}): Promise<ListResult<T>> {
    const bucket = readLocalDb()[name] ?? {};
    let rows = Object.values(bucket) as Row[];

    const clauses = options.where ?? [];
    if (!options.noSchoolScope && !clauses.some(([field]) => field === "schoolId")) {
      rows = rows.filter((row) => row.schoolId === SCHOOL_ID);
    }
    rows = rows.filter((row) => clauses.every((clause) => matchesWhere(row, clause)));
    return paginate(applySearchAndSort(rows, options) as T[], options);
  },

  async get<T>(name: CollectionName, id: string): Promise<T | null> {
    return (readLocalDb()[name]?.[id] as T | undefined) ?? null;
  },

  async create<T extends object>(name: CollectionName, data: T, id?: string): Promise<string> {
    const db = readLocalDb();
    db[name] ||= {};
    const payload = data as Row;
    const docId = id || (payload.id as string) || makeId(name.slice(0, 3));
    const stamp = nowIso();
    db[name][docId] = {
      ...payload,
      id: docId,
      schoolId: payload.schoolId ?? SCHOOL_ID,
      createdAt: payload.createdAt ?? stamp,
      updatedAt: stamp,
    };
    writeLocalDb(db);
    return docId;
  },

  async update(name: CollectionName, id: string, patch: Record<string, unknown>): Promise<void> {
    const db = readLocalDb();
    const current = db[name]?.[id];
    if (!current) throw new Error("not-found");
    db[name][id] = { ...current, ...patch, id, updatedAt: nowIso() };
    writeLocalDb(db);
  },

  async remove(name: CollectionName, id: string): Promise<void> {
    const db = readLocalDb();
    if (db[name]?.[id]) {
      delete db[name][id];
      writeLocalDb(db);
    }
  },

  async bulkCreate<T extends object>(name: CollectionName, rows: T[]): Promise<number> {
    const db = readLocalDb();
    db[name] ||= {};
    const stamp = nowIso();
    rows.forEach((row, index) => {
      const payload = row as Row;
      const docId = (payload.id as string) || makeId(`${name.slice(0, 3)}${index}`);
      db[name][docId] = {
        ...payload,
        id: docId,
        schoolId: payload.schoolId ?? SCHOOL_ID,
        createdAt: stamp,
        updatedAt: stamp,
      };
    });
    writeLocalDb(db);
    return rows.length;
  },

  async nextSequence(counterName: string): Promise<number> {
    const db = readLocalDb();
    db.counters ||= {};
    const next = ((db.counters[counterName]?.value as number) ?? 0) + 1;
    db.counters[counterName] = {
      id: counterName,
      name: counterName,
      value: next,
      schoolId: SCHOOL_ID,
      createdAt: db.counters[counterName]?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    writeLocalDb(db);
    return next;
  },
};

export function clearLocalDb(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_KEY);
}

export function localDbIsEmpty(): boolean {
  return Object.keys(readLocalDb()).length === 0;
}

/* ------------------------------------------------------------------ *
 * Cloud Firestore driver
 * ------------------------------------------------------------------ */

function requireDb() {
  const db = getFirebaseDb();
  if (!db) throw new Error("Cloud Firestore is not configured.");
  return db;
}

export const firestoreDriver: Driver = {
  async list<T>(name: CollectionName, options: QueryOptions = {}): Promise<ListResult<T>> {
    const db = requireDb();
    const clauses = [...(options.where ?? [])];
    if (!options.noSchoolScope && !clauses.some(([field]) => field === "schoolId")) {
      clauses.unshift(["schoolId", "==", SCHOOL_ID]);
    }

    let q = fsQuery(collection(db, name));
    for (const [field, op, value] of clauses) {
      q = fsQuery(q, fsWhere(field, op as WhereFilterOp, value as never));
    }

    // Firestore needs a composite index to combine `where` with `orderBy`; the
    // required pairs are declared in firestore.indexes.json.
    const primaryOrder = options.orderBy?.[0];
    const fetchLimit = (options.offset ?? 0) + (options.limit ?? 200);
    if (primaryOrder) q = fsQuery(q, fsOrderBy(primaryOrder[0], primaryOrder[1]));
    q = fsQuery(q, fsLimit(Math.min(fetchLimit, 500)));

    const snapshot = await getDocs(q);
    const rows = snapshot.docs.map((d) => ({ ...(d.data() as Row), id: d.id })) as T[];
    return paginate(applySearchAndSort(rows, options), options);
  },

  async get<T>(name: CollectionName, id: string): Promise<T | null> {
    const db = requireDb();
    const snapshot = await fsGetDoc(doc(db, name, id));
    return snapshot.exists() ? ({ ...(snapshot.data() as Row), id: snapshot.id } as T) : null;
  },

  async create<T extends object>(name: CollectionName, data: T, id?: string): Promise<string> {
    const db = requireDb();
    const payload = data as Row;
    const docId = id || (payload.id as string) || doc(db, name).id;
    const stamp = nowIso();
    await setDoc(doc(db, name, docId), {
      ...payload,
      id: docId,
      schoolId: payload.schoolId ?? SCHOOL_ID,
      createdAt: payload.createdAt ?? stamp,
      updatedAt: stamp,
    });
    return docId;
  },

  async update(name: CollectionName, id: string, patch: Record<string, unknown>): Promise<void> {
    const db = requireDb();
    await fsUpdateDoc(doc(db, name, id), { ...patch, updatedAt: nowIso() });
  },

  async remove(name: CollectionName, id: string): Promise<void> {
    const db = requireDb();
    await fsDeleteDoc(doc(db, name, id));
  },

  async bulkCreate<T extends object>(name: CollectionName, rows: T[]): Promise<number> {
    const db = requireDb();
    const stamp = nowIso();
    // A Firestore batch is capped at 500 writes; stay well inside the limit.
    for (let i = 0; i < rows.length; i += 200) {
      const batch = writeBatch(db);
      rows.slice(i, i + 200).forEach((row) => {
        const payload = row as Row;
        const docId = (payload.id as string) || doc(db, name).id;
        batch.set(doc(db, name, docId), {
          ...payload,
          id: docId,
          schoolId: payload.schoolId ?? SCHOOL_ID,
          createdAt: stamp,
          updatedAt: stamp,
        });
      });
      await batch.commit();
    }
    return rows.length;
  },

  async nextSequence(counterName: string): Promise<number> {
    const db = requireDb();
    const ref = doc(db, "counters", counterName);
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const next = ((snapshot.data()?.value as number) ?? 0) + 1;
      if (snapshot.exists()) {
        transaction.update(ref, { value: next, updatedAt: nowIso() });
      } else {
        transaction.set(ref, {
          name: counterName,
          value: next,
          schoolId: SCHOOL_ID,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
      }
      return next;
    });
  },
};

export const store: Driver = DATA_MODE === "firebase" ? firestoreDriver : localDriver;

/* ------------------------------------------------------------------ *
 * Convenience wrappers
 * ------------------------------------------------------------------ */

export function listDocs<T>(name: CollectionName, options?: QueryOptions) {
  return store.list<T>(name, options);
}
export function getDocById<T>(name: CollectionName, id: string) {
  return store.get<T>(name, id);
}
export function createDoc<T extends object>(name: CollectionName, data: T, id?: string) {
  return store.create<T>(name, data, id);
}
export function updateDocById(name: CollectionName, id: string, patch: Record<string, unknown>) {
  return store.update(name, id, patch);
}
export function deleteDocById(name: CollectionName, id: string) {
  return store.remove(name, id);
}
export function bulkCreateDocs<T extends object>(name: CollectionName, rows: T[]) {
  return store.bulkCreate<T>(name, rows);
}
export function nextSequence(counterName: string) {
  return store.nextSequence(counterName);
}
