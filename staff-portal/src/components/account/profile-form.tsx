"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { normalizeUsername, validateEmail, validateUsername } from "@/lib/accounts";
import { sendJson } from "@/lib/upload-client";

export type UsernameRequest = {
  requestedUsername: string;
  status: string;
  reason: string | null;
};

export function ProfileForm({
  username: initialUsername,
  displayName: initialName,
  email: initialEmail,
  canRename,
  usernameRequest,
}: {
  username: string;
  displayName: string;
  email: string;
  canRename: boolean;
  usernameRequest?: UsernameRequest | null;
}) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [username, setUsername] = useState(initialUsername);
  const [requested, setRequested] = useState("");
  const [request, setRequest] = useState(usernameRequest ?? null);
  const [displayName, setDisplayName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = canRename ? normalizeUsername(username) : initialUsername;
    const problem = (canRename ? validateUsername(name) : null) ?? validateEmail(email.trim());
    if (problem) {
      toast(problem, "error");
      return;
    }
    setSaving(true);
    try {
      await sendJson("/api/account", "PATCH", { username: name, displayName, contactEmail: email });
      toast("Your details have been saved.");
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function requestUsername() {
    const name = normalizeUsername(requested);
    const problem = validateUsername(name);
    if (problem) {
      toast(problem, "error");
      return;
    }
    setRequesting(true);
    try {
      await sendJson("/api/account/username-request", "POST", { username: name });
      setRequest({ requestedUsername: name, status: "pending", reason: null });
      setRequested("");
      toast("Your request has been sent. An administrator will review it.");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setRequesting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Username" hint={canRename ? "You sign in with this." : "You sign in with this."}>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
          readOnly={!canRename}
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </Field>
      {!canRename && (
        <div className="space-y-3">
          {request?.status === "pending" && (
            <Notice kind="info">Waiting for an administrator to review @{request.requestedUsername}.</Notice>
          )}
          {request?.status === "rejected" && request.reason && <Notice kind="error">{request.reason}</Notice>}
          <Field label="New username" hint="An administrator has to approve this. A name that is already in use is refused.">
            <Input
              value={requested}
              onChange={(e) => setRequested(e.target.value.toLowerCase().replace(/\s+/g, ""))}
              autoCapitalize="none"
              spellCheck={false}
              placeholder="The username you want"
            />
          </Field>
          <Button type="button" variant="secondary" disabled={requesting || !requested} onClick={requestUsername}>
            {requesting ? "Sending…" : "Request this username"}
          </Button>
        </div>
      )}
      <Field label="Full name">
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </Field>
      <Field label="Contact email" optional>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}
