"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Pencil, Plus, Trash2, Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCollection } from "@/hooks/useCollection";
import { createDoc, deleteDocById, listDocs, updateDocById, type WhereClause } from "@/lib/data/store";
import { buildModuleSchema, normaliseValues, type ModuleDefinition, type ModuleField, type Row, type SelectOption } from "@/features/modules/schema";
import { SCHOOL_ID } from "@/lib/firebase/client";
import { describeError } from "@/lib/utils/cn";
import { downloadCsv, type CsvColumn } from "@/lib/utils/csv";
import { formatDate } from "@/lib/utils/format";
import { formatMoney } from "@/lib/utils/money";
import { Badge, Button, Card, Checkbox, Field, Input, Select, StatusBadge, Textarea } from "@/components/ui/primitives";
import { ConfirmDialog, Dialog, useToast } from "@/components/ui/overlays";
import { EmptyState, KeyValue, LoadingBlock, Pagination, SearchInput, SelectFilter } from "@/components/ui/feedback";
import type { CollectionName } from "@/types";

function manageCapability(capability: string): string {
  return capability.replace(/\.view$/, ".manage");
}

/** Loads every dynamic `source` referenced by a module's fields, once. */
function useModuleOptions(module: ModuleDefinition) {
  const { locale, tl } = useI18n();
  const sources = useMemo(() => {
    const map = new Map<CollectionName, { labelEn: string; labelBn?: string; where?: WhereClause[]; orderBy?: [string, "asc" | "desc"][] }>();
    for (const field of module.fields) {
      if (field.source && !map.has(field.source.collection)) {
        map.set(field.source.collection, {
          labelEn: field.source.labelEn,
          labelBn: field.source.labelBn,
          where: field.source.where,
          orderBy: field.source.orderBy,
        });
      }
    }
    return Array.from(map.entries());
  }, [module]);

  const [options, setOptions] = useState<Record<string, SelectOption[]>>({});

  useEffect(() => {
    let active = true;
    async function load() {
      const next: Record<string, SelectOption[]> = {};
      await Promise.all(
        sources.map(async ([collectionName, config]) => {
          try {
            const result = await listDocs<Row>(collectionName, { where: config.where, orderBy: config.orderBy, limit: 200 });
            next[collectionName] = result.rows.map((row) => ({
              value: row.id,
              label: {
                en: String(row[config.labelEn] ?? row.id),
                bn: config.labelBn ? String(row[config.labelBn] ?? row[config.labelEn] ?? row.id) : String(row[config.labelEn] ?? row.id),
              },
            }));
          } catch {
            next[collectionName] = [];
          }
        }),
      );
      if (active) setOptions(next);
    }
    void load();
    return () => {
      active = false;
    };
  }, [sources]);

  const forField = useCallback(
    (field: ModuleField): SelectOption[] => {
      if (field.options) return field.options;
      if (field.source) return options[field.source.collection] ?? [];
      return [];
    },
    [options],
  );

  const labelFor = useCallback(
    (field: ModuleField, value: unknown): string => {
      const found = forField(field).find((option) => option.value === String(value));
      if (!found) return value === undefined || value === null || value === "" ? "—" : String(value);
      return locale === "bn" ? found.label.bn || found.label.en : found.label.en || found.label.bn;
    },
    [forField, locale],
  );

  return { forField, labelFor, tl, options };
}

function CellValue({ row, field, labelFor, locale }: { row: Row; field: ModuleField; labelFor: (f: ModuleField, v: unknown) => string; locale: "bn" | "en" }) {
  const value = row[field.name];
  switch (field.tableAs) {
    case "money":
      return <span className="font-medium tabular-nums text-slate-800">{formatMoney(Number(value) || 0, locale)}</span>;
    case "date":
      return <span className="tabular-nums">{formatDate(value ? String(value) : null, locale)}</span>;
    case "badge": {
      const text = field.type === "boolean" ? (value ? (locale === "bn" ? "হ্যাঁ" : "Yes") : locale === "bn" ? "না" : "No") : labelFor(field, value);
      const status = String(value ?? "");
      if (field.type === "boolean") return <Badge tone={value ? "green" : "neutral"}>{text}</Badge>;
      if (["active", "published", "paid", "verified", "present", "passed", "returned"].includes(status)) return <StatusBadge status={status} label={text} />;
      return <Badge tone="blue">{text}</Badge>;
    }
    case "bilingual":
      return <span className={locale === "bn" ? "bn" : undefined}>{String(value || "—")}</span>;
    default: {
      if (Array.isArray(value)) return <span className="text-xs text-slate-600">{value.length ? value.map(String).join(", ") : "—"}</span>;
      const text = field.source || field.options ? labelFor(field, value) : String(value ?? "");
      return <span className={field.name.toLowerCase().includes("bn") ? "bn" : undefined}>{text}</span>;
    }
  }
}

export interface ModulePanelProps {
  module: ModuleDefinition;
  extraWhere?: WhereClause[];
  detailExtra?: (row: Row, close: () => void) => React.ReactNode;
  toolbarExtra?: React.ReactNode;
  hideCreate?: boolean;
  refreshKey?: number;
}

export function ModulePanel({ module, extraWhere, detailExtra, toolbarExtra, hideCreate, refreshKey }: ModulePanelProps) {
  const { t, locale, tl } = useI18n();
  const toast = useToast();
  const { can } = useAuth();
  const { forField, labelFor } = useModuleOptions(module);

  const canManage = can(manageCapability(module.capability) as never) || can(module.capability as never);
  const canEdit = can(manageCapability(module.capability) as never);
  const canExport = Boolean(module.allowExport) && (canEdit || can("backup.export" as never));

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const pageSize = module.pageSize ?? 10;

  const where = useMemo<WhereClause[]>(() => {
    const clauses: WhereClause[] = [...(extraWhere ?? [])];
    for (const filter of module.filters ?? []) {
      const value = filterValues[filter.field];
      if (value && value !== "all") clauses.push([filter.field, "==", value]);
    }
    return clauses;
  }, [extraWhere, filterValues, module.filters]);

  const { rows, total, loading, error, reload } = useCollection<Row>(module.collection, {
    where,
    orderBy: module.orderBy,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    search: search.trim() || undefined,
    searchFields: module.searchFields,
  });

  useEffect(() => {
    if (refreshKey !== undefined) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const tableFields = useMemo(() => module.fields.filter((field) => field.inTable), [module]);

  const schema = useMemo(() => buildModuleSchema(module.fields), [module]);
  const formFields = useMemo(() => module.fields.filter((field) => !field.readOnly), [module]);

  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const openCreate = useCallback(() => {
    const initial: Record<string, unknown> = {};
    for (const field of formFields) {
      initial[field.name] =
        field.defaultValue !== undefined
          ? field.defaultValue
          : field.type === "boolean"
            ? false
            : field.type === "multiselect"
              ? ""
              : "";
    }
    setFormValues(initial);
    setFormErrors({});
    setEditing("new");
  }, [formFields]);

  const openEdit = useCallback(
    (row: Row) => {
      const initial: Record<string, unknown> = {};
      for (const field of formFields) {
        const value = row[field.name];
        initial[field.name] =
          field.type === "multiselect"
            ? Array.isArray(value)
              ? value.join(", ")
              : ""
            : value === undefined || value === null
              ? field.type === "boolean"
                ? false
                : ""
              : value;
      }
      setFormValues(initial);
      setFormErrors({});
      setEditing(row);
    },
    [formFields],
  );

  // React Hook Form drives validation; values are mirrored into local state so
  // dynamic option lists can re-render the fields without losing input.
  const form = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema),
    values: formValues,
    mode: "onBlur",
  });

  async function submitForm() {
    const result = await schema.safeParseAsync(normaliseValues(formFields, form.getValues()));
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (!next[key]) next[key] = issue.code === "too_small" ? t("validation.required") : issue.message;
      }
      setFormErrors(next);
      toast.error(t("error.title"), t("validation.required"));
      return;
    }
    setFormErrors({});
    const values = result.data;
    setBusy(true);
    try {
      if (editing === "new") {
        for (const field of module.unique ?? []) {
          const duplicate = await listDocs<Row>(module.collection, { where: [[field, "==", values[field]]], limit: 1 });
          if (duplicate.rows.length > 0) {
            throw new Error(`already-exists:${field}`);
          }
        }
        const payload = module.onCreate ? module.onCreate({ ...values, schoolId: SCHOOL_ID }) : { ...values, schoolId: SCHOOL_ID };
        const docId = module.documentId ? module.documentId(values) : undefined;
        await createDoc(module.collection, payload, docId);
        toast.success(t("common.save"), locale === "bn" ? "নতুন রেকর্ড সংরক্ষিত হয়েছে।" : "Record created.");
      } else if (editing) {
        await updateDocById(module.collection, editing.id, values);
        toast.success(t("common.save"), locale === "bn" ? "পরিবর্তন সংরক্ষিত হয়েছে।" : "Changes saved.");
      }
      setEditing(null);
      reload();
    } catch (cause) {
      const message = describeError(cause);
      const duplicateField = message.startsWith("already-exists:") ? message.split(":")[1] : null;
      toast.error(
        t("error.title"),
        duplicateField
          ? locale === "bn"
            ? `"${duplicateField}" মানটি ইতোমধ্যে ব্যবহৃত হয়েছে।`
            : `A record with this "${duplicateField}" already exists.`
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    try {
      await deleteDocById(module.collection, pendingDelete.id);
      toast.success(locale === "bn" ? "মুছে ফেলা হয়েছে" : "Deleted");
      setPendingDelete(null);
      reload();
    } catch (cause) {
      toast.error(t("error.title"), describeError(cause));
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const columns: CsvColumn<Row>[] = module.fields
      .filter((field) => !field.readOnly || field.name === "status")
      .map((field) => ({
        key: field.name,
        header: field.label.en,
        value: (row) => {
          const value = row[field.name];
          if (Array.isArray(value)) return value.join("|");
          if (field.tableAs === "money") return Number(value) || 0;
          return value === undefined || value === null ? "" : String(value);
        },
      }));
    downloadCsv(`${module.id}-export.csv`, rows, columns);
    toast.info(locale === "bn" ? "এক্সপোর্ট সম্পন্ন" : "Export complete", locale === "bn" ? "বর্তমান পৃষ্ঠার রেকর্ড ডাউনলোড হয়েছে।" : "Rows on the current page were downloaded.");
  }

  const filterOptions = (module.filters ?? []).map((filter) => ({
    filter,
    options: filter.options.length > 0 ? filter.options : (module.fields.find((f) => f.name === filter.field) ? forField(module.fields.find((f) => f.name === filter.field)!) : []),
  }));

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <SearchInput
            value={search}
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder={t("common.searchPlaceholder")}
            className="w-full sm:w-64"
          />
          {filterOptions.map(({ filter, options }) => (
            <SelectFilter
              key={filter.field}
              label={tl(filter.label)}
              value={filterValues[filter.field] ?? "all"}
              onChange={(value) => { setFilterValues((current) => ({ ...current, [filter.field]: value })); setPage(1); }}
              options={[{ value: "all", label: `${t("common.all")} — ${tl(filter.label)}` }, ...options.map((option) => ({ value: option.value, label: tl(option.label) }))]}
            />
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {toolbarExtra}
            {canExport ? (
              <Button variant="outline" size="sm" onClick={exportCsv} icon={<Download className="size-4" />}>
                {t("common.export")}
              </Button>
            ) : null}
            {!hideCreate && canEdit && module.allowCreate !== false ? (
              <Button size="sm" onClick={openCreate} icon={<Plus className="size-4" />}>
                {t("common.create")}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={reload} aria-label={t("common.retry")}>
              ↻
            </Button>
          </div>
        </div>

        {loading ? (
          <LoadingBlock label={t("common.loading")} />
        ) : error ? (
          <EmptyState title={t("error.loadFailed")} body={error} action={<Button size="sm" variant="outline" onClick={reload}>{t("common.retry")}</Button>} />
        ) : rows.length === 0 ? (
          <EmptyState title={t("empty.title")} body={t("empty.body")} />
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[46rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  {tableFields.map((field) => (
                    <th
                      key={field.name}
                      scope="col"
                      className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${field.hideOnMobile ? "hidden md:table-cell" : ""}`}
                    >
                      {tl(field.label)}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-royal-50/40">
                    {tableFields.map((field) => (
                      <td key={field.name} className={`px-4 py-3 align-middle text-slate-700 ${field.hideOnMobile ? "hidden md:table-cell" : ""}`}>
                        <CellValue row={row} field={field} labelFor={labelFor} locale={locale} />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setDetail(row)} aria-label={t("common.view")} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-navy-700">
                          <Eye className="size-4" />
                        </button>
                        {canEdit && canManage ? (
                          <button type="button" onClick={() => openEdit(row)} aria-label={t("common.edit")} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-royal-50 hover:text-royal-700">
                            <Pencil className="size-4" />
                          </button>
                        ) : null}
                        {canEdit && module.allowDelete ? (
                          <button type="button" onClick={() => setPendingDelete(row)} aria-label={t("common.delete")} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700">
                            <Trash2 className="size-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > pageSize ? (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            labels={{ showing: t("common.showing"), of: t("common.of"), results: t("common.results"), previous: t("common.previous"), next: t("common.next") }}
          />
        ) : null}
      </Card>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? t("common.create") : t("common.edit")}
        description={tl(module.title)}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>{t("common.cancel")}</Button>
            <Button onClick={form.handleSubmit(submitForm)} loading={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
          </>
        }
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit(submitForm)} noValidate>
          {formFields.map((field) => {
            const error = formErrors[field.name] ?? (form.formState.errors[field.name]?.message as string | undefined);
            const common = {
              id: `field-${field.name}`,
              invalid: Boolean(error),
              ...form.register(field.name),
            };
            if (field.type === "boolean") {
              return (
                <div key={field.name} className={field.span === 2 ? "sm:col-span-2" : undefined}>
                  <Checkbox
                    label={tl(field.label)}
                    checked={Boolean(formValues[field.name])}
                    onChange={(event) => {
                      form.setValue(field.name, event.target.checked, { shouldDirty: true });
                      setFormValues((current) => ({ ...current, [field.name]: event.target.checked }));
                    }}
                  />
                  {field.hint ? <p className="mt-1 text-xs text-slate-500">{tl(field.hint)}</p> : null}
                </div>
              );
            }
            return (
              <Field
                key={field.name}
                label={tl(field.label)}
                htmlFor={`field-${field.name}`}
                required={field.required}
                error={error}
                hint={field.hint ? tl(field.hint) : undefined}
                className={field.span === 2 ? "sm:col-span-2" : undefined}
              >
                {field.type === "textarea" ? (
                  <Textarea rows={3} placeholder={field.placeholder} className={locale === "bn" && field.name.toLowerCase().endsWith("bn") ? "bn" : undefined} {...common} />
                ) : field.type === "select" ? (
                  <Select {...common}>
                    <option value="">{locale === "bn" ? "নির্বাচন করুন" : "Select…"}</option>
                    {forField(field).map((option) => (
                      <option key={option.value} value={option.value}>
                        {tl(option.label)}
                      </option>
                    ))}
                  </Select>
                ) : field.type === "number" || field.type === "money" ? (
                  <Input type="number" inputMode="numeric" step={field.type === "money" ? 1 : "any"} min={field.min} max={field.max} {...common} />
                ) : field.type === "date" ? (
                  <Input type="date" {...common} />
                ) : (
                  <Input
                    type={field.name.toLowerCase().includes("email") ? "email" : "text"}
                    placeholder={field.placeholder}
                    className={locale === "bn" && field.name.toLowerCase().endsWith("bn") ? "bn" : undefined}
                    {...common}
                  />
                )}
              </Field>
            );
          })}
        </form>
      </Dialog>

      <Dialog open={detail !== null} onClose={() => setDetail(null)} title={t("common.viewDetails")} description={tl(module.title)} size="lg">
        {detail ? (
          <>
            <KeyValue
              items={module.fields.map((field) => ({
                label: tl(field.label),
                value:
                  field.tableAs === "money"
                    ? formatMoney(Number(detail[field.name]) || 0, locale)
                    : field.tableAs === "date"
                      ? formatDate(detail[field.name] ? String(detail[field.name]) : null, locale)
                      : Array.isArray(detail[field.name])
                        ? (detail[field.name] as unknown[]).join(", ") || "—"
                        : field.source || field.options
                          ? labelFor(field, detail[field.name])
                          : String(detail[field.name] ?? "—"),
              }))}
            />
            <div className="mt-5 flex flex-wrap gap-2">
              {detailExtra?.(detail, () => setDetail(null))}
              {canEdit ? (
                <Button size="sm" variant="outline" icon={<Pencil className="size-4" />} onClick={() => { const row = detail; setDetail(null); openEdit(row); }}>
                  {t("common.edit")}
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t("confirm.deleteTitle")}
        body={t("confirm.deleteBody")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        loading={busy}
      />
    </div>
  );
}
