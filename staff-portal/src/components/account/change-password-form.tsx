"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordHints, PasswordInput } from "@/components/ui/password-input";
import { Field, Notice } from "@/components/ui/form-bits";
import { validatePassword } from "@/lib/accounts";

export function ChangePasswordForm({ forced = false }: { forced?: boolean }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const policyError = validatePassword(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (password !== confirm) {
      setError("The two new passwords are not the same.");
      return;
    }
    if (password === current) {
      setError(forced ? "Choose a password different from the one-time password." : "Choose a password different from the current one.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: password }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (!res || !res.ok) {
      setError(json.error ?? "Could not change the password. Please try again.");
      return;
    }
    if (forced) {
      window.location.href = "/";
      return;
    }
    setMessage("Your password has been changed.");
    setCurrent("");
    setPassword("");
    setConfirm("");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label={forced ? "One-time password" : "Current password"} hint={forced ? "The password the administrator gave you." : undefined}>
        <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </Field>
      <Field label="New password">
        <PasswordInput
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={10}
          required
        />
      </Field>
      <Field label="Confirm new password">
        <PasswordInput
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={10}
          required
        />
        <PasswordHints password={password} confirm={confirm} />
      </Field>
      {error && <Notice kind="error">{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}
      <Button type="submit" disabled={saving} className={forced ? "w-full" : undefined}>
        {saving ? "Saving…" : forced ? "Save and continue" : "Change password"}
      </Button>
    </form>
  );
}
