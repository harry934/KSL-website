"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(err.message);
      return;
    }
    setMessage("Password updated successfully.");
    setPassword("");
    setConfirm("");
  }

  return (
    <form onSubmit={onSubmit} className="ksl-card max-w-md space-y-4 p-6">
      <div>
        <label className="mb-1 block text-xs font-medium text-[#5c6578]">New password</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-[#5c6578]">Confirm password</label>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      {message && <p className="text-sm text-[#0165FC]">{message}</p>}
      <Button type="submit">Update password</Button>
    </form>
  );
}
