"use client";

import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";
import { forwardRef, useId, useState, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { controlClass } from "@/components/ui/input";

export const fieldLabel = "mb-1.5 block text-[13px] font-semibold text-[#1f2933]";

export function Field({
  label,
  hint,
  optional,
  className,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className={fieldLabel}>
        {label}
        {optional && <span className="ml-1 font-normal text-[#8a96a5]">(optional)</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[12.5px] leading-snug text-[#6b7785]">{hint}</p>}
    </div>
  );
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(controlClass, "min-h-[96px] py-2.5 leading-relaxed", className)} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <div className="relative min-w-0">
        <select ref={ref} className={cn(controlClass, "h-[42px] appearance-none pr-9", className)} {...props} />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7785]" />
      </div>
    );
  }
);

const NEW_CHOICE = "__new__";

/** Dropdown of existing choices plus "Add new…", which switches to a text box. */
export function ChoiceField({
  value,
  options,
  onChange,
  newLabel = "Add new…",
  placeholder = "Type the new name",
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string, label: string) => void;
  newLabel?: string;
  placeholder?: string;
}) {
  const known = options.some((o) => o.value === value);
  const [adding, setAdding] = useState(!known && !!value);

  if (adding) {
    return (
      <div className="flex gap-2">
        <input
          className={cn(controlClass, "h-[42px]")}
          value={value}
          placeholder={placeholder}
          autoFocus
          onChange={(e) => onChange(e.target.value, e.target.value)}
        />
        <button
          type="button"
          className="shrink-0 rounded-[6px] px-3 text-[13px] font-semibold text-[#5b6775] hover:bg-[#eef2f6]"
          onClick={() => {
            setAdding(false);
            if (options[0]) onChange(options[0].value, options[0].label);
          }}
        >
          Pick from list
        </button>
      </div>
    );
  }

  return (
    <Select
      value={known ? value : ""}
      onChange={(e) => {
        if (e.target.value === NEW_CHOICE) {
          setAdding(true);
          onChange("", "");
          return;
        }
        const option = options.find((o) => o.value === e.target.value);
        onChange(e.target.value, option?.label ?? e.target.value);
      }}
    >
      {!known && <option value="">Choose…</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      <option value={NEW_CHOICE}>{newLabel}</option>
    </Select>
  );
}

/** A titled white card that groups related fields. */
export function FormSection({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("ksl-card", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#eef1f4] px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-[#6b7785]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function FieldGrid({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>;
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0b1f3a]/20 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-[#1b7a3d]" : "bg-[#c3ccd7]"
        )}
      >
        <span
          className={cn(
            "inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[20px]" : "translate-x-[2px]"
          )}
        />
      </button>
      <label htmlFor={id} className={cn("min-w-0", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
        <span className="block text-[14px] font-semibold text-[#1f2933]">{label}</span>
        {hint && <span className="mt-0.5 block text-[12.5px] text-[#6b7785]">{hint}</span>}
      </label>
    </div>
  );
}

/** "Show on website" switch backed by the published / draft status. */
export function VisibilitySwitch({
  status,
  onChange,
  canPublish = true,
}: {
  status: string;
  onChange: (status: "published" | "draft") => void;
  canPublish?: boolean;
}) {
  const live = status === "published";
  return (
    <Switch
      checked={live}
      onChange={(on) => onChange(on ? "published" : "draft")}
      disabled={!canPublish}
      label={live ? "Shown on website" : "Hidden (draft)"}
      hint={
        canPublish
          ? live
            ? "Visitors can see this. Switch off to hide it."
            : "Only staff can see this. Switch on to show it on the website."
          : "You can save changes. An administrator will put this on the website."
      }
    />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const live = status === "published";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
        live ? "bg-[#1b7a3d]/10 text-[#1b7a3d]" : "bg-[#eef1f4] text-[#5b6775]"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-[#1b7a3d]" : "bg-[#98a3b1]")} />
      {live ? "On website" : status === "archived" ? "Archived" : "Hidden"}
    </span>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "rounded-[6px] border px-3 py-2.5 text-[13.5px]",
        kind === "error" && "border-red-200 bg-red-50 text-[#b42318]",
        kind === "success" && "border-green-200 bg-green-50 text-[#1b7a3d]",
        kind === "info" && "border-[#cfe0ef] bg-[#f1f7fc] text-[#125d95]"
      )}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] border border-dashed border-[#d5dce4] bg-white px-5 py-10 text-center text-[14px] text-[#6b7785]">
      {children}
    </div>
  );
}

export function SaveBar({ children }: { children: React.ReactNode }) {
  return <div className="save-bar">{children}</div>;
}
