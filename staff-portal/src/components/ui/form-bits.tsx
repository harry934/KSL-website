import { cn } from "@/lib/cn";
import { forwardRef, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export const fieldLabel = "mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#5b6775]";

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <label className={fieldLabel}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-[#5b6775]">{hint}</p>}
    </div>
  );
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-[90px] w-full rounded-[2px] border border-[#b8c2cc] bg-white px-2.5 py-2 text-[13px] text-[#1f2933] focus:border-[#0b1f3a] focus:outline-none focus:ring-2 focus:ring-[#c5a028]/25",
          className
        )}
        {...props}
      />
    );
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full rounded-[2px] border border-[#b8c2cc] bg-white px-2.5 py-2 text-[13px] text-[#1f2933] focus:border-[#0b1f3a] focus:outline-none",
          className
        )}
        {...props}
      />
    );
  }
);

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "border-[#1b7a3d]/30 bg-[#1b7a3d]/10 text-[#1b7a3d]"
      : status === "archived"
        ? "border-[#d7dde5] bg-[#f4f6f8] text-[#5b6775]"
        : "border-[#b45309]/30 bg-[#b45309]/10 text-[#b45309]";
  return (
    <span className={cn("inline-block rounded-[2px] border px-2 py-0.5 text-[11px] font-semibold capitalize", tone)}>
      {status}
    </span>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "border px-3 py-2 text-sm",
        kind === "error" ? "border-red-200 bg-red-50 text-[#b42318]" : "border-green-200 bg-green-50 text-[#1b7a3d]"
      )}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
