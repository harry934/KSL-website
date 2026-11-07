"use client";

import { InputHTMLAttributes, forwardRef, useEffect, useMemo, useRef, useState } from "react";
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

/** Read-only passcode boxes. Groups on "-" when present; 6-digit codes show as 3 − 3. */
export function PasscodeDisplay({ value, accepted = false }: { value: string; accepted?: boolean }) {
  const groups = useMemo(() => {
    const raw = value.trim();
    if (!raw) return [] as string[];
    if (raw.includes("-")) return raw.split("-").filter(Boolean);
    if (/^\d{6}$/.test(raw)) return [raw.slice(0, 3), raw.slice(3)];
    return [raw];
  }, [value]);

  return (
    <div className="passcode-display">
      <div className="passcode-groups" aria-label="One-time passcode">
        {groups.map((group, groupIndex) => (
          <div key={`${groupIndex}-${group}`} className="passcode-cluster">
            {groupIndex > 0 ? <span className="passcode-dash" aria-hidden>-</span> : null}
            <div className="passcode-group">
              {group.split("").map((char, charIndex) => (
                <span key={`${groupIndex}-${charIndex}`} className={cn("passcode-cell", accepted && "is-accepted")}>
                  {char}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {accepted ? <p className="passcode-accepted">Code accepted.</p> : null}
    </div>
  );
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

/** Interactive 6-digit passcode entry with staggered paste / autofill animation. */
export function PasscodeInput({
  value,
  onChange,
  disabled,
  accepted = false,
  animateFill,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  accepted?: boolean;
  /** When this changes to a 6-digit code, fill the boxes with a staggered animation. */
  animateFill?: string | null;
}) {
  const digits = digitsOnly(value).split("");
  while (digits.length < 6) digits.push("");
  const [focused, setFocused] = useState<number | null>(null);
  const [popping, setPopping] = useState<number>(-1);
  const animRef = useRef<number | null>(null);
  const lastFillRef = useRef<string | null>(null);

  function clearAnim() {
    if (animRef.current != null) {
      window.clearTimeout(animRef.current);
      animRef.current = null;
    }
  }

  function fillAnimated(code: string) {
    const next = digitsOnly(code);
    if (!next) return;
    clearAnim();
    setPopping(-1);
    onChange("");
    let i = 0;
    const step = () => {
      i += 1;
      onChange(next.slice(0, i));
      setPopping(i - 1);
      if (i < next.length) {
        animRef.current = window.setTimeout(step, 55);
      } else {
        animRef.current = window.setTimeout(() => {
          setPopping(-1);
          focusIndex(Math.min(next.length, 5));
        }, 180);
      }
    };
    animRef.current = window.setTimeout(step, 40);
  }

  useEffect(() => () => clearAnim(), []);

  useEffect(() => {
    const next = digitsOnly(String(animateFill ?? ""));
    if (!/^\d{6}$/.test(next)) return;
    if (lastFillRef.current === next) return;
    lastFillRef.current = next;
    fillAnimated(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when animateFill changes
  }, [animateFill]);

  function setAt(index: number, char: string) {
    clearAnim();
    setPopping(-1);
    const next = digits.map((d, i) => (i === index ? char : d));
    onChange(next.join("").replace(/\D/g, "").slice(0, 6));
  }

  function focusIndex(index: number) {
    const el = document.getElementById(`passcode-digit-${index}`) as HTMLInputElement | null;
    el?.focus();
  }

  function digitField(i: number) {
    const waiting = focused === i && !digits[i];
    return (
      <input
        key={i}
        id={`passcode-digit-${i}`}
        className={cn(
          "passcode-cell passcode-input-cell",
          accepted && "is-accepted",
          waiting && "is-waiting",
          popping === i && "is-pop"
        )}
        inputMode="numeric"
        autoComplete={i === 0 ? "one-time-code" : "off"}
        aria-label={`Digit ${i + 1} of 6`}
        maxLength={1}
        disabled={disabled}
        value={digits[i]}
        onFocus={() => setFocused(i)}
        onBlur={() => setFocused((current) => (current === i ? null : current))}
        onChange={(e) => {
          const char = e.target.value.replace(/\D/g, "").slice(-1);
          setAt(i, char);
          if (char && i < 5) focusIndex(i + 1);
        }}
        onKeyDown={(e) => {
          if (e.key === "Backspace" && !digits[i] && i > 0) {
            e.preventDefault();
            setAt(i - 1, "");
            focusIndex(i - 1);
          }
          if (e.key === "ArrowLeft" && i > 0) focusIndex(i - 1);
          if (e.key === "ArrowRight" && i < 5) focusIndex(i + 1);
        }}
        onPaste={(e) => {
          e.preventDefault();
          const pasted = digitsOnly(e.clipboardData.getData("text"));
          if (!pasted) return;
          fillAnimated(pasted);
        }}
      />
    );
  }

  return (
    <div className="passcode-display">
      <div className="passcode-groups" role="group" aria-label="One-time passcode">
        <div className="passcode-cluster">
          <div className="passcode-group">{[0, 1, 2].map(digitField)}</div>
        </div>
        <span className="passcode-dash" aria-hidden>
          -
        </span>
        <div className="passcode-cluster">
          <div className="passcode-group">{[3, 4, 5].map(digitField)}</div>
        </div>
      </div>
      {accepted ? <p className="passcode-accepted">Code accepted.</p> : null}
    </div>
  );
}
