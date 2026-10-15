"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      setError("Passwords do not match.");
      return;
    }
    if (password === current) {
      setError("Choose a password different from the current one.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: password }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Could not update password.");
      return;
    }
    if (forced) {
      window.location.href = "/";
      return;
    }
    setMessage("Password updated.");
    setCurrent("");
    setPassword("");
    setConfirm("");
  }

  const label = "mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#5b6775]";

  return (
    <form onSubmit={onSubmit} className="ksl-card max-w-md space-y-4 border-t-[3px] border-t-[#c5a028] p-6">
      <div>
        <label className={label}>{forced ? "Temporary password" : "Current password"}</label>
        <Input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div>
        <label className={label}>New password</label>
        <Input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={10}
          required
        />
        <p className="mt-1 text-[12px] text-[#5b6775]">At least 10 characters, with letters and numbers.</p>
      </div>
      <div>
        <label className={label}>Confirm new password</label>
        <Input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={10}
          required
        />
      </div>
      {error && <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#b42318]">{error}</p>}
      {message && <p className="border border-green-200 bg-green-50 px-3 py-2 text-sm text-[#1b7a3d]">{message}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
