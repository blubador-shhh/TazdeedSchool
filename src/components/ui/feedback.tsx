"use client";

import { ChevronLeft, ChevronRight, Inbox, RefreshCw, Search, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Badge, Button, Input, Select, Spinner } from "@/components/ui/primitives";

/* ---------------------------------- States --------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-skeleton rounded-md bg-slate-200/70", className)} />;
}

export function TableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <Skeleton key={colIndex} className={cn("h-8 flex-1", colIndex === 0 && "max-w-[28%]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <Inbox className="size-6" />}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {body ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{body}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-rose-50 text-rose-600">
        <TriangleAlert className="size-6" />
      </span>
      <p className="max-w-md text-sm text-slate-600">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry} icon={<RefreshCw className="size-4" />}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

/* --------------------------------- Controls -------------------------------- */

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="pl-9"
        aria-label={placeholder ?? "Search"}
      />
    </div>
  );
}

export function SelectFilter({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className={cn("min-w-[9rem]", className)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  labels,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  labels: { showing: string; of: string; results: string; previous: string; next: string };
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500">
        {labels.showing} {from}–{to} {labels.of} {total} {labels.results}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={labels.previous}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="px-2 text-xs font-medium text-slate-600">
          {page} / {pageCount}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label={labels.next}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="no-print flex items-center gap-1.5 text-xs text-slate-500">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          {item.href ? (
            <Link href={item.href} className="rounded transition-colors hover:text-royal-700">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-700" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label="Sections" className={cn("scroll-thin flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            active === tab.id ? "bg-navy-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100",
          )}
        >
          {tab.label}
          {typeof tab.count === "number" ? (
            <span className={cn("rounded-full px-1.5 text-[10px] font-semibold", active === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>
              {tab.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Spinner /> {label}
    </div>
  );
}

/* --------------------------------- DataTable -------------------------------- */

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyBody,
  onRowClick,
  toolbar,
  footer,
  labels,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle: string;
  emptyBody?: string;
  onRowClick?: (row: T) => void;
  toolbar?: ReactNode;
  footer?: ReactNode;
  labels: { loading: string };
}) {
  return (
    <div className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-card">
      {toolbar ? <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">{toolbar}</div> : null}
      {loading ? (
        <TableSkeleton columns={Math.min(columns.length, 5)} />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} body={emptyBody} />
      ) : (
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500",
                      column.hideOnMobile && "hidden md:table-cell",
                      column.className,
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-slate-100 last:border-0 transition-colors",
                    onRowClick && "cursor-pointer hover:bg-royal-50/40",
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn("px-4 py-3 align-middle text-slate-700", column.hideOnMobile && "hidden md:table-cell", column.className)}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer}
    </div>
  );
}

export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-800">{item.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CountBadge({ count }: { count: number }) {
  return <Badge tone={count > 0 ? "amber" : "neutral"}>{count}</Badge>;
}
