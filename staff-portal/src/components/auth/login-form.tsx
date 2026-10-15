"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      setLoading(false);
      setError(json.error ?? "Could not sign in. Check your connection and try again.");
      return;
    }
    window.location.href = "/";
  }

  const label = "mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#5b6775]";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor="login-identifier" className={label}>
          Username or email
        </label>
        <Input
          id="login-identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="e.g. jkamau"
        />
      </div>
      <div>
        <label htmlFor="login-password" className={label}>
          Password
        </label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full py-2.5" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
