"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { fieldLabel, Notice } from "@/components/ui/form-bits";
import { createClient } from "@/lib/supabase/client";
import { passkeyError } from "@/lib/passkey";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setLoading(false);
      setError(json.error ?? "Could not sign in. Check your internet connection and try again.");
      return;
    }
    window.location.href = "/";
  }

  async function onPasskey() {
    setError(null);
    setPasskeyLoading(true);
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPasskey();
    const message = passkeyError(signInError);
    if (signInError || !data?.session) {
      if (signInError) await supabase.auth.signOut().catch(() => null);
      setPasskeyLoading(false);
      if (message) setError(message);
      return;
    }
    const res = await fetch("/api/auth/passkey", { method: "POST" }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      await supabase.auth.signOut().catch(() => null);
      setPasskeyLoading(false);
      setError(json.error ?? "This passkey is not linked to an active staff account.");
      return;
    }
    window.location.href = "/";
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="login-username" className={fieldLabel}>
          Username
        </label>
        <Input
          id="login-username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={loading}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="login-password" className={fieldLabel}>
          Password
        </label>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          required
          disabled={loading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      <Button type="submit" className="w-full" disabled={loading || passkeyLoading} aria-busy={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <Button type="button" variant="secondary" className="w-full" disabled={loading || passkeyLoading} onClick={onPasskey}>
        {passkeyLoading ? "Waiting for your passkey…" : "Sign in with a passkey"}
      </Button>
    </form>
  );
}
