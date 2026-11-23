"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { fieldLabel, Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { startAuthentication } from "@simplewebauthn/browser";
import { passkeyError } from "@/lib/passkey";
import { appPath } from "@/lib/base-path";
import { AuthenticatorCodeStep } from "@/components/auth/authenticator-code-step";

type LoginStep = "sign-in" | "mfa" | "recover" | "recover-totp" | "recover-passkey";

export function LoginForm({ notice }: { notice?: string | null }) {
  const { toast } = useFeedback();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("sign-in");
  const [afterRecoveryMfa, setAfterRecoveryMfa] = useState(false);

  function goHome() {
    window.location.href = appPath("/");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(appPath("/api/auth/sign-in"), {
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
    setLoading(false);
    if (json.mfaRequired) {
      setAfterRecoveryMfa(false);
      setStep("mfa");
      setError(null);
      toast("Enter the code from your authenticator app.");
      return;
    }
    toast("Signed in.");
    goHome();
  }

  async function onMfaSubmit(input: { code: string; recoveryCode: string; useRecovery: boolean }) {
    setError(null);
    setLoading(true);
    const body = input.useRecovery
      ? { recoveryCode: input.recoveryCode.trim() }
      : { code: input.code.replace(/\D/g, "").slice(0, 6) };
    const res = await fetch(appPath("/api/auth/mfa"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setLoading(false);
    if (!res || !res.ok) {
      const message = json.error ?? "The code was not accepted.";
      setError(message);
      toast(message, "error");
      return;
    }
    if (json.passwordResetRequired) {
      toast("Choose a new password to continue.");
    } else {
      toast("Signed in.");
    }
    goHome();
  }

  async function onPasskey() {
    setError(null);
    setPasskeyLoading(true);
    try {
      const optionsResponse = await fetch(appPath("/api/auth/passkey"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "authentication-options" }),
      });
      const options = await optionsResponse.json().catch(() => ({}));
      if (!optionsResponse.ok) throw new Error(options.error ?? "Passkey sign-in is unavailable.");
      const credential = await startAuthentication({ optionsJSON: options });
      const verifyResponse = await fetch(appPath("/api/auth/passkey"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "authentication-verify",
          challenge: options.challenge,
          response: credential,
        }),
      });
      const result = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(result.error ?? "The passkey was not accepted.");
      if (result.mfaRequired) {
        setPasskeyLoading(false);
        setAfterRecoveryMfa(false);
        setStep("mfa");
        toast("Enter the code from your authenticator app.");
        return;
      }
      toast("Signed in.");
      goHome();
    } catch (caught) {
      setPasskeyLoading(false);
      const message = passkeyError(caught);
      if (message) {
        setError(message);
        toast(message, "error");
      }
    }
  }

  async function onRecoverTotpSubmit(input: { code: string; recoveryCode: string; useRecovery: boolean }) {
    if (!username.trim()) {
      setError("Enter the username you sign in with.");
      return;
    }
    setError(null);
    setLoading(true);
    const body = input.useRecovery
      ? { action: "totp-verify", username, recoveryCode: input.recoveryCode.trim() }
      : { action: "totp-verify", username, code: input.code.replace(/\D/g, "").slice(0, 6) };
    const res = await fetch(appPath("/api/auth/recover"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setLoading(false);
    if (!res || !res.ok) {
      const message = json.error ?? "Could not recover access.";
      setError(message);
      toast(message, "error");
      return;
    }
    toast("Choose a new password to continue.");
    goHome();
  }

  async function onRecoverPasskey() {
    if (!username.trim()) {
      setError("Enter the username you sign in with.");
      return;
    }
    setError(null);
    setPasskeyLoading(true);
    try {
      const optionsResponse = await fetch(appPath("/api/auth/recover"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "passkey-options", username }),
      });
      const options = await optionsResponse.json().catch(() => ({}));
      if (!optionsResponse.ok) throw new Error(options.error ?? "Passkey recovery is unavailable.");
      const credential = await startAuthentication({ optionsJSON: options });
      const verifyResponse = await fetch(appPath("/api/auth/recover"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "passkey-verify",
          username,
          challenge: options.challenge,
          response: credential,
        }),
      });
      const result = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(result.error ?? "The passkey was not accepted.");
      setPasskeyLoading(false);
      if (result.mfaRequired) {
        setAfterRecoveryMfa(true);
        setStep("mfa");
        toast("Enter the code from your authenticator app.");
        return;
      }
      if (result.passwordResetRequired) {
        toast("Choose a new password to continue.");
        goHome();
        return;
      }
      toast("Signed in.");
      goHome();
    } catch (caught) {
      setPasskeyLoading(false);
      const message = passkeyError(caught);
      if (message) {
        setError(message);
        toast(message, "error");
      }
    }
  }

  if (step === "mfa") {
    return (
      <AuthenticatorCodeStep
        intro={
          afterRecoveryMfa
            ? "Passkey accepted. Enter the 6-digit code from your authenticator app to finish recovering access."
            : "Password accepted. Open your authenticator app and enter the 6-digit code."
        }
        busy={loading}
        error={error}
        showRecoveryToggle
        onSubmit={onMfaSubmit}
        onBack={() => {
          setStep(afterRecoveryMfa ? "recover" : "sign-in");
          setAfterRecoveryMfa(false);
          setError(null);
        }}
      />
    );
  }

  if (step === "recover-totp") {
    return (
      <div className="space-y-4">
        <AuthenticatorCodeStep
          intro="Enter a current code from your authenticator app, or use a recovery code. You will be asked to choose a new password next."
          busy={loading}
          error={error}
          showRecoveryToggle
          onSubmit={onRecoverTotpSubmit}
          onBack={() => {
            setStep("recover");
            setError(null);
          }}
        />
      </div>
    );
  }

  if (step === "recover") {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="recover-username" className={fieldLabel}>
            Username
          </label>
          <Input
            id="recover-username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={loading || passkeyLoading}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <p className="text-[13.5px] text-[#5b6775]">
          Prove it is you with your authenticator app or a passkey. If you use a passkey, you will still need your authenticator code.
        </p>
        {error && <Notice kind="error">{error}</Notice>}
        <Button type="button" className="w-full" disabled={loading || passkeyLoading} onClick={() => setStep("recover-totp")}>
          Use authenticator app
        </Button>
        <Button type="button" variant="secondary" className="w-full" disabled={loading || passkeyLoading} onClick={onRecoverPasskey}>
          {passkeyLoading ? "Waiting for your passkey…" : "Use a passkey"}
        </Button>
        <button
          type="button"
          className="block w-full text-center text-[13px] text-[#6b7785] underline"
          onClick={() => {
            setStep("sign-in");
            setError(null);
          }}
        >
          Back to sign in
        </button>
      </div>
    );
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
      <Button type="submit" className="w-full" disabled={loading || passkeyLoading} aria-busy={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <Button type="button" variant="secondary" className="w-full" disabled={loading || passkeyLoading} onClick={onPasskey}>
        {passkeyLoading ? "Waiting for your passkey…" : "Sign in with a passkey"}
      </Button>
      <button
        type="button"
        className="block w-full text-center text-[13.5px] font-semibold text-[#0b1f3a] underline"
        onClick={() => {
          setError(null);
          setStep("recover");
        }}
      >
        Forgot password?
      </button>
    </form>
  );
}