"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { controlClass } from "@/components/ui/input";

/** Password box with a Show / Hide button. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  function PasswordInput({ className, disabled, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          disabled={disabled}
          className={cn(controlClass, "h-[42px] pr-11", className)}
          {...props}
        />
        <button
          type="button"
          className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[6px] text-[#5b6775] hover:bg-[#eef1f4] hover:text-[#0b1f3a] disabled:opacity-50"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          title={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  }
);

/** Live checklist under a new password: turns green as each rule is met. */
export function PasswordHints({ password, confirm }: { password: string; confirm?: string }) {
  const rules = [
    { ok: password.length >= 10, label: "At least 10 characters" },
    { ok: /[a-zA-Z]/.test(password), label: "A letter" },
    { ok: /[0-9]/.test(password), label: "A number" },
  ];
  if (confirm !== undefined) rules.push({ ok: password.length > 0 && password === confirm, label: "Both boxes match" });
  return (
    <div className="password-hints" aria-live="polite">
      {rules.map((rule) => (
        <span key={rule.label} className={rule.ok ? "is-ok" : undefined}>
          {rule.ok ? <Check className="h-3.5 w-3.5" /> : <span aria-hidden>•</span>}
          {rule.label}
        </span>
      ))}
    </div>
  );
}
