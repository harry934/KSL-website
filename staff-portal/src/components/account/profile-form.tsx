"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeUsername, validateEmail, validateUsername } from "@/lib/accounts";

export function ProfileForm({
  username: initialUsername,
  displayName: initialName,
  email: initialEmail,
}: {
  username: string;
  displayName: string;
  email: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const name = normalizeUsername(username);
    const problem = validateUsername(name) ?? validateEmail(email.trim());
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: name, displayName, contactEmail: email }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Could not save profile.");
      return;
    }
    setMessage("Profile saved.");
    router.refresh();
  }

  const label = "mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#5b6775]";

  return (
    <form onSubmit={onSubmit} className="ksl-card max-w-md space-y-4 border-t-[3px] border-t-[#c5a028] p-6">
      <div>
        <label className={label}>Username</label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          autoCapitalize="none"
          spellCheck={false}
          required
        />
      </div>
      <div>
        <label className={label}>Full name</label>
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div>
        <label className={label}>Email (optional)</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className="mt-1 text-[12px] text-[#5b6775]">If set, you can also sign in with this email.</p>
      </div>
      {error && <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#b42318]">{error}</p>}
      {message && <p className="border border-green-200 bg-green-50 px-3 py-2 text-sm text-[#1b7a3d]">{message}</p>}
      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
