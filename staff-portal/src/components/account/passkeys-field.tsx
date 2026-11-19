"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/form-bits";
import { startRegistration } from "@simplewebauthn/browser";
import { passkeyError } from "@/lib/passkey";
import { appPath } from "@/lib/base-path";

type SavedPasskey = {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
};

function when(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function PasskeysField() {
  const [items, setItems] = useState<SavedPasskey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(shouldUpdate: () => boolean = () => true) {
    const response = await fetch(appPath("/api/auth/passkey"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list" }),
    }).catch(() => null);
    const result = response ? await response.json().catch(() => ({})) : {};
    if (!response?.ok) {
      if (shouldUpdate()) {
        setError(result.error ?? "Passkeys could not be loaded.");
        setItems([]);
      }
      return;
    }
    if (shouldUpdate()) {
      setError(null);
      setItems(result.items ?? []);
    }
  }

  useEffect(() => {
    let active = true;
    load(() => active)
      .catch(() => {
        if (!active) return;
        setError("Passkeys could not be loaded.");
        setItems([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function addPasskey() {
    setBusy(true);
    setError(null);
    try {
      const optionsResponse = await fetch(appPath("/api/auth/passkey"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "registration-options" }),
      });
      const options = await optionsResponse.json().catch(() => ({}));
      if (!optionsResponse.ok) throw new Error(options.error ?? "Passkey registration is unavailable.");
      const credential = await startRegistration({ optionsJSON: options });
      const verifyResponse = await fetch(appPath("/api/auth/passkey"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "registration-verify",
          challenge: options.challenge,
          response: credential,
        }),
      });
      const result = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(result.error ?? "The passkey could not be saved.");
      await load();
    } catch (caught) {
      setError(passkeyError(caught) ?? "The passkey was not added.");
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(id: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(appPath("/api/auth/passkey"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", credentialId: id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "The passkey could not be removed.");
      await load();
    } catch (caught) {
      setError(passkeyError(caught) ?? "The passkey was not removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-[13.5px] leading-relaxed text-[#5b6775]">
        A passkey lets you sign in with this device or password manager. It is added to the account you are already using. It does not create a new account.
      </p>
      {loading ? (
        <p className="text-[13.5px] text-[#5b6775]">Loading passkeys…</p>
      ) : items.length === 0 ? (
        <p className="text-[13.5px] text-[#5b6775]">No passkey is saved on this account.</p>
      ) : (
        <ul className="divide-y divide-[#e6ebf1] rounded-[8px] border border-[#e3e8ee]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span>
                <span className="block text-[14px] font-semibold text-[#0b1f3a]">{item.friendly_name || "Passkey"}</span>
                <span className="block text-[12.5px] text-[#6b7785]">
                  Added {when(item.created_at)}
                  {item.last_used_at ? ` · Last used ${when(item.last_used_at)}` : ""}
                </span>
              </span>
              <Button variant="danger" size="sm" disabled={busy} onClick={() => removePasskey(item.id)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      <Button type="button" variant="secondary" disabled={busy || loading} onClick={addPasskey}>
        {busy ? "Waiting…" : "Add a passkey"}
      </Button>
    </div>
  );
}
