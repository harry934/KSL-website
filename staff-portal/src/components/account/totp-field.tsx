"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Field, Notice } from "@/components/ui/form-bits";
import { appPath } from "@/lib/base-path";

type Status = {
  enabled: boolean;
  enabledAt: string | null;
  recoveryRemaining: number;
  setupInProgress: boolean;
};

export function TotpField() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [mode, setMode] = useState<"idle" | "setup" | "disable">("idle");

  async function load() {
    const response = await fetch(appPath("/api/account/totp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status" }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      setError(result.error ?? "Could not load authenticator settings.");
      setStatus(null);
      return;
    }
    setError(null);
    setStatus(result as Status);
    if (result.setupInProgress) setMode("setup");
    else if (!result.enabled) setMode("idle");
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function beginSetup() {
    if (!password.trim()) {
      setError("Enter your current password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(appPath("/api/account/totp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "begin", password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Setup could not start.");
      setQrDataUrl(result.qrDataUrl ?? null);
      setManualKey(result.manualKey ?? "");
      setMode("setup");
      setRecoveryCodes(null);
      setCode("");
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmSetup() {
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code from your app.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(appPath("/api/account/totp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", code }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "The code was not accepted.");
      setRecoveryCodes(Array.isArray(result.recoveryCodes) ? result.recoveryCodes : []);
      setPassword("");
      setCode("");
      setQrDataUrl(null);
      setManualKey("");
      setMode("idle");
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disableTotp() {
    if (!password.trim()) {
      setError("Enter your current password.");
      return;
    }
    if (!code.trim() && !recoveryCode.trim()) {
      setError("Enter a 6-digit code or a recovery code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(appPath("/api/account/totp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disable",
          password,
          code: code || undefined,
          recoveryCode: recoveryCode || undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not turn off the authenticator.");
      setPassword("");
      setCode("");
      setRecoveryCode("");
      setMode("idle");
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-[13.5px] text-[#5b6775]">Loading authenticator settings…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-[13.5px] leading-relaxed text-[#5b6775]">
        Use a free app such as Google Authenticator, Microsoft Authenticator, or Aegis. When it is turned on, you enter a 6-digit code after your password.
      </p>
      {status?.enabled ? (
        <p className="text-[13.5px] text-[#0b1f3a]">
          Authenticator is <span className="font-semibold">on</span>
          {status.recoveryRemaining > 0 ? ` · ${status.recoveryRemaining} recovery codes left` : " · no unused recovery codes left"}.
        </p>
      ) : (
        <p className="text-[13.5px] text-[#6b7785]">Authenticator is off. Your password alone is enough to sign in.</p>
      )}

      {recoveryCodes && (
        <Notice kind="info">
          <p className="font-semibold text-[#0b1f3a]">Save these recovery codes once. Each code works only once if you lose your phone.</p>
          <ul className="mt-2 grid gap-1 font-mono text-[13px] sm:grid-cols-2">
            {recoveryCodes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Notice>
      )}

      {!status?.enabled && mode !== "setup" && (
        <div className="space-y-3 max-w-md">
          <Field label="Current password">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>
          <Button type="button" disabled={busy} onClick={beginSetup}>
            {busy ? "Starting…" : "Set up authenticator"}
          </Button>
        </div>
      )}

      {mode === "setup" && (
        <div className="space-y-4 max-w-md">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR code for authenticator app" className="rounded-[8px] border border-[#e3e8ee] bg-white p-2" width={220} height={220} />
          ) : null}
          {manualKey ? (
            <p className="text-[12.5px] text-[#6b7785]">
              Or enter this key manually: <span className="font-mono text-[#0b1f3a]">{manualKey}</span>
            </p>
          ) : null}
          <Field label="6-digit code">
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={confirmSetup}>
              {busy ? "Checking…" : "Turn on authenticator"}
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => { setMode("idle"); setQrDataUrl(null); setManualKey(""); setCode(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {status?.enabled && (
        <div className="space-y-3 max-w-md">
          {mode === "disable" ? (
            <>
              <Field label="Current password">
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </Field>
              <Field label="Authenticator code">
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </Field>
              <Field label="Or recovery code" optional>
                <Input value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} autoComplete="off" />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="danger" disabled={busy} onClick={disableTotp}>
                  {busy ? "Removing…" : "Turn off authenticator"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setMode("idle")}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setMode("disable")}>
              Turn off authenticator
            </Button>
          )}
        </div>
      )}

      {error && <Notice kind="error">{error}</Notice>}
    </div>
  );
}