"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn, initials } from "@/lib/utils/cn";

/* ---------------------------------- Button --------------------------------- */

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-royal-600 text-white hover:bg-royal-700 active:bg-royal-800 shadow-sm",
  secondary: "bg-navy-600 text-white hover:bg-navy-700 active:bg-navy-800 shadow-sm",
  outline: "border border-slate-300 bg-white text-slate-800 hover:border-royal-400 hover:text-royal-700",
  ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  success: "bg-emerald-brand text-white hover:brightness-95",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, icon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ---------------------------------- Fields --------------------------------- */

export const Label = forwardRef<HTMLLabelElement, { children: ReactNode; htmlFor?: string; required?: boolean; className?: string }>(
  function Label({ children, htmlFor, required, className }, ref) {
    return (
      <label ref={ref} htmlFor={htmlFor} className={cn("mb-1.5 block text-sm font-medium text-slate-700", className)}>
        {children}
        {required ? <span className="ml-0.5 text-rose-600">*</span> : null}
      </label>
    );
  },
);

const FIELD_BASE =
  "w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-royal-500 focus:outline-none focus:ring-2 focus:ring-royal-100 disabled:bg-slate-50 disabled:text-slate-500";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, ...props }, ref) {
  return <input ref={ref} className={cn(FIELD_BASE, "h-10", invalid && "border-rose-400 focus:border-rose-500 focus:ring-rose-100", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={cn(FIELD_BASE, "py-2 leading-relaxed", invalid && "border-rose-400 focus:border-rose-500", className)}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(FIELD_BASE, "h-10 appearance-none bg-[length:16px] pr-8", invalid && "border-rose-400", className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.6rem center",
        }}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-xs font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700", className)}>
      <input type="checkbox" className="size-4 rounded border-slate-300 text-royal-600 focus:ring-royal-500" {...props} />
      {label}
    </label>
  );
}

/* ---------------------------------- Surfaces -------------------------------- */

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-card border border-slate-200 bg-white shadow-card", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardContent({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

const BADGE_TONES: Record<string, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-royal-50 text-royal-700 ring-royal-100",
  navy: "bg-navy-50 text-navy-700 ring-navy-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
};

export type BadgeTone = keyof typeof BADGE_TONES;

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

/** Maps domain status strings to a consistent badge tone. */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone: BadgeTone =
    ["paid", "verified", "active", "published", "present", "passed", "returned", "admitted"].includes(status)
      ? "green"
      : ["partial", "late", "pending", "unverified", "draft", "shortlisted", "invited", "issued"].includes(status)
        ? "amber"
        : ["unpaid", "overdue", "absent", "failed", "disabled", "rejected", "overdue"].includes(status)
          ? "rose"
          : ["archived", "waived", "closed", "read"].includes(status)
            ? "neutral"
            : "blue";
  return <Badge tone={tone}>{label ?? status}</Badge>;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "blue" | "green" | "amber" | "navy" | "rose";
}) {
  const tones: Record<string, string> = {
    blue: "bg-royal-50 text-royal-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    navy: "bg-navy-50 text-navy-700",
    rose: "bg-rose-50 text-rose-700",
  };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {icon ? <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", tones[tone])}>{icon}</span> : null}
      </div>
    </Card>
  );
}

export function Avatar({ name, src, size = "md", className }: { name?: string; src?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-16 text-lg" } as const;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name ?? ""} className={cn("shrink-0 rounded-full object-cover ring-1 ring-slate-200", sizes[size], className)} />
  ) : (
    <span className={cn("grid shrink-0 place-items-center rounded-full bg-navy-100 font-semibold text-navy-700 ring-1 ring-navy-200", sizes[size], className)}>
      {initials(name)}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, subtitle, align = "center" }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; align?: "center" | "left" }) {
  return (
    <div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "text-left")}>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.14em] text-royal-600">{eyebrow}</p> : null}
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy-700 sm:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{subtitle}</p> : null}
    </div>
  );
}
