"use client";

import { InputHTMLAttributes, forwardRef, useMemo, useState } from "react";
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

export type PasswordRule = { id: string; ok: boolean; label: string };

export function passwordRules(password: string): PasswordRule[] {
  return [
    { id: "length", ok: password.length >= 12, label: "12 characters or more" },
    { id: "case", ok: /[a-z]/.test(password) && /[A-Z]/.test(password), label: "Upper and lower case" },
    { id: "number", ok: /[0-9]/.test(password), label: "A number" },
    { id: "symbol", ok: /[^A-Za-z0-9]/.test(password), label: "A symbol" },
  ];
}

function strengthMeta(score: number) {
  if (score <= 0) return { label: "", color: "#e4e7ec" };
  if (score === 1) return { label: "Weak", color: "#f04438" };
  if (score === 2) return { label: "Fair", color: "#f79009" };
  if (score === 3) return { label: "Good", color: "#12b76a" };
  return { label: "Strong", color: "#12b76a" };
}

/** Strength bar and checklist under a new password. */
export function PasswordHints({ password, confirm }: { password: string; confirm?: string }) {
  const rules = passwordRules(password);
  const score = rules.filter((rule) => rule.ok).length;
  const strength = strengthMeta(password.length === 0 ? 0 : score);
  const matchOk = confirm !== undefined && password.length > 0 && password === confirm;

  return (
    <div className="password-strength" aria-live="polite">
      <div className="password-strength-meter" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score} aria-label="Password strength">
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            className="password-strength-segment"
            style={{ background: i < score && password.length > 0 ? strength.color : "#e4e7ec" }}
          />
        ))}
      </div>
      {strength.label ? (
        <p className="password-strength-label" style={{ color: strength.color }}>
          {strength.label}
        </p>
      ) : null}
      <ul className="password-strength-list">
        {rules.map((rule) => (
          <li key={rule.id} className={cn("password-strength-item", rule.ok && "is-ok")}>
            <span className="password-strength-check" aria-hidden>
              {rule.ok ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
            {rule.label}
          </li>
        ))}
        {confirm !== undefined ? (
          <li className={cn("password-strength-item", matchOk && "is-ok")}>
            <span className="password-strength-check" aria-hidden>
              {matchOk ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
            </span>
            Both passwords match
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/** Read-only one-time passcode shown as character boxes, grouped like XXXX-XXXX-XXXX. */
export function PasscodeDisplay({ value, accepted = false }: { value: string; accepted?: boolean }) {
  const groups = useMemo(() => value.split("-").filter(Boolean), [value]);

  return (
    <div className="passcode-display">
      <div className="passcode-groups" aria-label="One-time passcode">
        {groups.map((group, groupIndex) => (
          <div key={`${groupIndex}-${group}`} className="passcode-group">
            {group.split("").map((char, charIndex) => (
              <span key={`${groupIndex}-${charIndex}`} className={cn("passcode-cell", accepted && "is-accepted")}>
                {char}
              </span>
            ))}
          </div>
        ))}
      </div>
      {accepted ? <p className="passcode-accepted">Code accepted.</p> : null}
    </div>
  );
}
