"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { sendJson } from "@/lib/upload-client";

export function PasswordRequest({
  request,
}: {
  request: { status: string; reason: string | null } | null;
}) {
  const { toast } = useFeedback();
  const [state, setState] = useState(request);
  const [sending, setSending] = useState(false);
  const waiting = state?.status === "pending";

  async function send() {
    setSending(true);
    try {
      await sendJson("/api/account/password-request", "POST");
      setState({ status: "pending", reason: null });
      toast("Your request has been sent. Wait for an email or message from an administrator.");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      {waiting && (
        <Notice kind="info">
          Waiting for an administrator. Your password stays as it is until they send you a one-time passcode.
        </Notice>
      )}
      {state?.status === "rejected" ? (
        <Notice kind="error">
          {state.reason ? `${state.reason} ` : ""}
          Your password was not changed.
        </Notice>
      ) : null}
      <Button type="button" onClick={send} disabled={sending || waiting}>
        {sending ? "Sending…" : waiting ? "Request sent" : "Request a password change"}
      </Button>
    </div>
  );
}
