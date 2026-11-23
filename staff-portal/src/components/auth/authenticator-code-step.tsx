"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasscodeInput } from "@/components/ui/password-input";
import { Notice, fieldLabel } from "@/components/ui/form-bits";

export function AuthenticatorCodeStep({
  intro,
  busy,
  error,
  onSubmit,
  onBack,
  showRecoveryToggle,
}: {
  intro: string;
  busy: boolean;
  error: string | null;
  onSubmit: (input: { code: string; recoveryCode: string; useRecovery: boolean }) => void | Promise<void>;
  onBack?: () => void;
  showRecoveryToggle?: boolean;
}) {
  const [code, setCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-[#5b6775]">{intro}</p>
      {!useRecovery ? (
        <div className="text-center">
          <p className={fieldLabel}>Authenticator code</p>
          <div className="mt-3">
            <PasscodeInput value={code} onChange={setCode} disabled={busy} />
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="auth-recovery-code" className={fieldLabel}>
            Recovery code
          </label>
          <Input
            id="auth-recovery-code"
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            disabled={busy}
            autoComplete="off"
            autoFocus
          />
        </div>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      <Button
        type="button"
        className="w-full"
        disabled={busy || (!useRecovery && code.length !== 6) || (useRecovery && !recoveryCode.trim())}
        onClick={() => onSubmit({ code, recoveryCode, useRecovery })}
      >
        {busy ? "Checking…" : "Continue"}
      </Button>
      {showRecoveryToggle && (
        <button
          type="button"
          className="block w-full text-center text-[13.5px] font-semibold text-[#0b1f3a] underline"
          onClick={() => {
            setUseRecovery((value) => !value);
          }}
        >
          {useRecovery ? "Use authenticator code instead" : "Use a recovery code instead"}
        </button>
      )}
      {onBack && (
        <button
          type="button"
          className="block w-full text-center text-[13px] text-[#6b7785] underline"
          onClick={onBack}
        >
          Back
        </button>
      )}
    </div>
  );
}