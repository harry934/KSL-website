"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/form-bits";
import { PasscodeInput } from "@/components/ui/password-input";
import { appPath } from "@/lib/base-path";

export function MandatoryTotpSetup() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [started, setStarted] = useState(false);

  async function startSetup() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(appPath("/api/account/totp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "begin", mandatory: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Setup could not start.");
      setQrDataUrl(result.qrDataUrl ?? null);
      setManualKey(result.manualKey ?? "");
      setStarted(true);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (code.length !== 6) {
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
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (recoveryCodes) {
    return (
      <div className="space-y-4">
        <Notice kind="info">
          <p className="font-semibold text-[#0b1f3a]">Save these recovery codes once.</p>
          <ul className="mt-2 grid gap-1 font-mono text-[13px] sm:grid-cols-2">
            {recoveryCodes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Notice>
        <Button type="button" className="w-full" onClick={() => { window.location.href = appPath("/"); }}>
          Continue to the portal
        </Button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="space-y-4">
        <p className="text-[14px] text-[#5b6775]">
          New staff must add an authenticator app before using the portal. Use Google Authenticator, Microsoft Authenticator, or Aegis.
        </p>
        {error && <Notice kind="error">{error}</Notice>}
        <Button type="button" className="w-full" disabled={busy} onClick={startSetup}>
          {busy ? "Preparing…" : "Set up authenticator"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="QR code for authenticator app" className="mx-auto rounded-[8px] border border-[#e3e8ee] bg-white p-2" width={220} height={220} />
      ) : null}
      {manualKey ? (
        <p className="text-center text-[12.5px] text-[#6b7785]">
          Or enter this key manually: <span className="font-mono text-[#0b1f3a]">{manualKey}</span>
        </p>
      ) : null}
      <PasscodeInput value={code} onChange={setCode} disabled={busy} />
      {error && <Notice kind="error">{error}</Notice>}
      <Button type="button" className="w-full" disabled={busy || code.length !== 6} onClick={confirm}>
        {busy ? "Checking…" : "Turn on authenticator"}
      </Button>
    </div>
  );
}