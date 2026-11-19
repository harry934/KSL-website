"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { fieldLabel, Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";

export function LoginForm({ notice }: { notice?: string | null }) {
  const { toast } = useFeedback();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

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
      const message = json.error ?? "Could not sign in. Check your internet connection and try again.";
      setError(message);
      toast(message, "error");
      return;
    }
    toast("Signed in.");
    window.location.href = "/";
  }

  async function onForgot() {
    setError(null);
    setForgotMessage(null);
    if (!username.trim()) {
      setError("Enter the username you sign in with.");
      return;
    }
    setForgotLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setForgotLoading(false);
    if (!res || !res.ok) {
      const fail = json.error ?? "Could not send the request. Please try again.";
      setError(fail);
      toast(fail, "error");
      return;
    }
    const ok = json.message ?? "Your request has been sent. Wait for an email or message from an administrator.";
    setForgotMessage(ok);
    toast(ok);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="login-username" className={fieldLabel}>
          Username
        </label>
        <Input
          id="login-username"
          name="username"
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
          name="current-password"
          autoComplete="current-password"
          required
          disabled={loading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {notice && <Notice kind="info">{notice}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      {forgotMessage && <Notice kind="info">{forgotMessage}</Notice>}
      <Button type="submit" className="w-full" disabled={loading || forgotLoading} aria-busy={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      {forgot ? (
        <div className="space-y-3 border-t border-[#eef1f4] pt-3">
          <p className="text-[13.5px] text-[#5b6775]">
            An administrator will send a sign-up link and a one-time passcode by email or message. You will need to wait for that. The username above is the one the request uses.
          </p>
          <Button type="button" className="w-full" disabled={loading || forgotLoading} onClick={onForgot}>
            {forgotLoading ? "Sending…" : "Request a password reset"}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="block w-full text-center text-[13.5px] font-semibold text-[#0b1f3a] underline"
          onClick={() => {
            setError(null);
            setForgot(true);
          }}
        >
          Forgot password?
        </button>
      )}
    </form>
  );
}
