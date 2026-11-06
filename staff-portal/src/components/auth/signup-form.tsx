"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordHints, PasswordInput, PasscodeInput } from "@/components/ui/password-input";
import { Field, Notice, fieldLabel } from "@/components/ui/form-bits";
import { normalizeUsername, validatePassword, validateUsername } from "@/lib/accounts";
import { cn } from "@/lib/cn";

export function SignupForm({ token }: { token: string }) {
  const [passcode, setPasscode] = useState("");
  const [kind, setKind] = useState<"create" | "password_reset" | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [usernameHint, setUsernameHint] = useState<string | null>(null);

  useEffect(() => {
    if (kind !== "create") return;
    const next = normalizeUsername(username);
    if (!next) {
      setUsernameStatus("idle");
      setUsernameHint(null);
      return;
    }
    const formatError = validateUsername(next);
    if (formatError) {
      setUsernameStatus("invalid");
      setUsernameHint(formatError);
      return;
    }

    setUsernameStatus("checking");
    setUsernameHint("Checking…");
    const timer = window.setTimeout(async () => {
      const res = await fetch("/api/auth/invite/username-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, username: next }),
      }).catch(() => null);
      const json = res ? await res.json().catch(() => ({})) : {};
      if (!res || !res.ok) {
        setUsernameStatus("invalid");
        setUsernameHint(json.error ?? "Could not check that username.");
        return;
      }
      if (json.available) {
        setUsernameStatus("available");
        setUsernameHint("This username is available.");
      } else {
        setUsernameStatus("taken");
        setUsernameHint(json.reason ?? "This username isn't available. Please try another.");
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [username, kind, token]);

  async function verifyPasscode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(passcode)) {
      setError("Enter the 6-digit passcode.");
      return;
    }
    setVerifying(true);
    const res = await fetch("/api/auth/invite/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, passcode }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setVerifying(false);
    if (!res || !res.ok) {
      setError(json.error ?? "Could not check the passcode. Please try again.");
      return;
    }
    setKind(json.kind === "password_reset" ? "password_reset" : "create");
  }

  async function complete(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const policyError = validatePassword(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (password !== confirm) {
      setError("The two new passwords are not the same.");
      return;
    }
    const nextUsername = normalizeUsername(username);
    if (kind === "create") {
      const usernameError = validateUsername(nextUsername);
      if (usernameError) {
        setError(usernameError);
        return;
      }
      if (usernameStatus === "taken" || usernameStatus === "invalid") {
        setError(usernameHint ?? "This username isn't available. Please try another.");
        return;
      }
    }
    setSaving(true);
    const res = await fetch("/api/auth/invite/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        passcode,
        password,
        ...(kind === "create" ? { username: nextUsername } : {}),
      }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (!res || !res.ok) {
      setError(json.error ?? "Could not finish sign-up. Please try again.");
      return;
    }
    const notice = kind === "create" ? "account-ready" : "password-ready";
    window.location.href = `/login?notice=${notice}`;
  }

  if (!kind) {
    return (
      <form onSubmit={verifyPasscode} className="space-y-5">
        <div className="text-center">
          <p className={fieldLabel}>One-time passcode</p>
          <div className="mt-3">
            <PasscodeInput value={passcode} onChange={setPasscode} disabled={verifying} />
          </div>
        </div>
        {error && <Notice kind="error">{error}</Notice>}
        <Button type="submit" className="w-full" disabled={verifying || passcode.length !== 6}>
          {verifying ? "Checking…" : "Continue"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={complete} className="space-y-4">
      <div className="mb-1">
        <PasscodeInput value={passcode} onChange={() => undefined} disabled accepted />
      </div>
      {kind === "create" ? (
        <Field label="Username" hint="Lowercase letters and numbers. This is what you use to sign in.">
          <Input
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
            autoCapitalize="none"
            autoComplete="username"
            spellCheck={false}
            maxLength={10}
            required
            aria-describedby="username-availability"
          />
          {usernameHint ? (
            <p
              id="username-availability"
              className={cn(
                "mt-1.5 text-[12.5px]",
                usernameStatus === "available"
                  ? "text-[#1b7a3d]"
                  : usernameStatus === "checking"
                    ? "text-[#6b7785]"
                    : "text-[#b42318]"
              )}
            >
              {usernameHint}
            </p>
          ) : null}
        </Field>
      ) : null}
      <Field label="New password">
        <PasswordInput
          name="new-password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={12}
          required
        />
        <PasswordHints password={password} confirm={confirm} />
      </Field>
      <Field label="Confirm new password">
        <PasswordInput
          name="confirm-password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={12}
          required
        />
      </Field>
      {error && <Notice kind="error">{error}</Notice>}
      <Button
        type="submit"
        className="w-full"
        disabled={saving || (kind === "create" && usernameStatus !== "available")}
      >
        {saving ? "Saving…" : kind === "create" ? "Create account" : "Save password"}
      </Button>
    </form>
  );
}
