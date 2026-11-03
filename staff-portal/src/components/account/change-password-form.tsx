"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordHints, PasswordInput } from "@/components/ui/password-input";
import { Field, Notice } from "@/components/ui/form-bits";
import { validatePassword, validateUsername, normalizeUsername } from "@/lib/accounts";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm({
  forced = false,
  changeUsername = false,
  accountUsername = "",
}: {
  forced?: boolean;
  changeUsername?: boolean;
  accountUsername?: string;
}) {
  const [current, setCurrent] = useState("");
  const [username, setUsername] = useState("");
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
      setError(forced ? "Choose a password different from the one-time passcode." : "Choose a password different from the current one.");
      return;
    }
    const nextUsername = normalizeUsername(username);
    if (changeUsername) {
      const usernameError = validateUsername(nextUsername);
      if (usernameError) {
        setError(usernameError);
        return;
      }
    }
    setSaving(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: current,
        newPassword: password,
        ...(changeUsername ? { newUsername: nextUsername } : {}),
      }),
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
      {changeUsername && (
        <Field label="New username" hint="Lowercase letters and numbers. This replaces the username you were given.">
          <Input
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
            autoCapitalize="none"
            autoComplete="username"
            spellCheck={false}
            required
          />
        </Field>
      )}
      {!changeUsername && accountUsername ? (
        <input className="sr-only" type="text" name="username" autoComplete="username" defaultValue={accountUsername} tabIndex={-1} aria-hidden />
      ) : null}
      <Field label={forced ? "One-time passcode" : "Current password"} hint={forced ? "The passcode the administrator gave you." : undefined}>
        <PasswordInput name="current-password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </Field>
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
      {message && <Notice kind="success">{message}</Notice>}
      <Button type="submit" disabled={saving} className={forced ? "w-full" : undefined}>
        {saving ? "Saving…" : forced ? "Save and continue" : "Change password"}
      </Button>
    </form>
  );
}
