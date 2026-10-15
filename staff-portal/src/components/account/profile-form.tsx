"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { normalizeUsername, validateEmail, validateUsername } from "@/lib/accounts";
import { sendJson } from "@/lib/upload-client";

export function ProfileForm({
  username: initialUsername,
  displayName: initialName,
  email: initialEmail,
  canRename,
}: {
  username: string;
  displayName: string;
  email: string;
  canRename: boolean;
}) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);

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

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Username"
        hint={canRename ? "You sign in with this." : "You sign in with this. Only an administrator can change it."}
      >
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
          readOnly={!canRename}
          disabled={!canRename}
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </Field>
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
