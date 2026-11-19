"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasscodeDisplay } from "@/components/ui/password-input";
import { useFeedback } from "@/components/ui/feedback";
import { sendJson } from "@/lib/upload-client";
import { copyPlainText } from "@/lib/clipboard";

type AccountRequest = {
  id: string;
  kind: "username" | "password";
  requestedUsername: string | null;
  createdAt: string;
  displayName: string;
  username: string;
  email: string;
};

type Issued = {
  passcode: string;
  signupUrl: string;
  username: string;
};

export function AccountRequestsPanel() {
  const { toast } = useFeedback();
  const [requests, setRequests] = useState<AccountRequest[] | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await sendJson("/api/staff/requests", "GET");
      setRequests(data.requests ?? []);
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(task: () => Promise<Record<string, string> | null>) {
    setSaving(true);
    try {
      return await task();
    } catch (err) {
      toast((err as Error).message, "error");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function approveUsername(request: AccountRequest) {
    const data = await run(() => sendJson("/api/staff/requests", "POST", { id: request.id, action: "approve-username" }));
    if (!data) return;
    toast(`${request.displayName || request.username} can now sign in as @${request.requestedUsername}.`);
    load();
  }

  async function sendPassword(request: AccountRequest) {
    const data = await run(() => sendJson("/api/staff/requests", "POST", { id: request.id, action: "approve-password" }));
    if (!data) return;
    setIssued({
      passcode: String(data.passcode ?? ""),
      signupUrl: String(data.signupUrl ?? ""),
      username: request.username,
    });
    load();
  }

  async function reject(request: AccountRequest) {
    const reason = (reasons[request.id] ?? "").trim();
    if (!reason) {
      toast("Write a reason for the rejection.", "error");
      return;
    }
    const data = await run(() => sendJson("/api/staff/requests", "POST", { id: request.id, action: "reject", reason }));
    if (!data) return;
    toast(request.kind === "password" ? "Rejected. Their password is still the same." : "The request was rejected.");
    load();
  }

  async function copy(value: string, key: string) {
    const ok = await copyPlainText(value);
    if (!ok) {
      toast("Could not copy that. Select the text and press Ctrl+C.", "error");
      return;
    }
    setCopied(key);
    window.setTimeout(() => setCopied(null), 2000);
  }

  if (!requests?.length && !issued) return null;

  return (
    <section className="ksl-card p-5" aria-label="Account requests">
      <h2 className="text-[15px] font-bold text-[#0b1f3a]">Account requests</h2>
      <p className="mt-1 text-[13.5px] text-[#5b6775]">
        Username changes go through when the name is free. A password request is answered with a sign-up link and a 6-digit passcode.
      </p>
      {issued ? (
        <div className="mt-4 rounded-[8px] bg-[#f6f8fa] px-4 py-3">
          <p className="text-[13.5px] font-semibold text-[#0b1f3a]">Password reset ready for @{issued.username}</p>
          <div className="mt-3 flex justify-center">
            <PasscodeDisplay value={issued.passcode} accepted={copied === "passcode"} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => copy(issued.passcode, "passcode")}>
              {copied === "passcode" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "passcode" ? "Copied" : "Copy passcode"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => copy(issued.signupUrl, "link")}>
              {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "link" ? "Copied" : "Copy link"}
            </Button>
            <Button size="sm" onClick={() => setIssued(null)}>
              Done
            </Button>
          </div>
          <p className="mt-2 break-all font-mono text-[12.5px] text-[#3d4c5f]">{issued.signupUrl}</p>
        </div>
      ) : null}
      {requests && requests.length > 0 ? (
        <ul className="mt-4 divide-y divide-[#eef1f4]">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-[14px] font-semibold text-[#0b1f3a]">
                  {request.displayName || request.username}
                  <span className="font-normal text-[#6b7785]"> @{request.username}</span>
                </p>
                <p className="text-[13.5px] text-[#3d4c5f]">
                  {request.kind === "username"
                    ? `Wants to sign in as @${request.requestedUsername}.`
                    : "Asked for a password change. Rejecting leaves their password as it is."}
                </p>
              </div>
              <Input
                value={reasons[request.id] ?? ""}
                maxLength={300}
                onChange={(event) => setReasons((current) => ({ ...current, [request.id]: event.target.value }))}
                placeholder="Reason, if you reject this"
                aria-label={`Reason for ${request.username}`}
              />
              <div className="flex flex-wrap gap-2">
                {request.kind === "username" ? (
                  <Button onClick={() => approveUsername(request)} disabled={saving}>
                    Approve
                  </Button>
                ) : (
                  <Button onClick={() => sendPassword(request)} disabled={saving}>
                    Send reset invite
                  </Button>
                )}
                <Button variant="secondary" onClick={() => reject(request)} disabled={saving}>
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
