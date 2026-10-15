"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGrid, FormSection, Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { normalizeUsername, validateEmail, validateUsername } from "@/lib/accounts";
import { sendJson } from "@/lib/upload-client";
import { cn } from "@/lib/cn";

const EDITABLE_MODULES = (Object.keys(MODULE_LABELS) as ModuleKey[]).filter((k) => k !== "staff");
const PERM_FIELDS = ["can_view", "can_edit", "can_publish", "can_delete"] as const;
type PermField = (typeof PERM_FIELDS)[number];

const PERM_LABELS: Record<PermField, { title: string; hint: string }> = {
  can_view: { title: "See", hint: "Open this section" },
  can_edit: { title: "Change", hint: "Add and edit, saved as hidden drafts" },
  can_publish: { title: "Put live", hint: "Show changes on the website" },
  can_delete: { title: "Remove", hint: "Delete items" },
};

type PermRow = { module_key: ModuleKey } & Record<PermField, boolean>;

type StaffRow = {
  id: string;
  username: string;
  display_name: string;
  contact_email: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  must_change_password: boolean;
  permissions: PermRow[];
};

type Panel = { kind: "create" } | { kind: "edit"; row: StaffRow } | null;
type Issued = { username: string; password: string; isNew: boolean };

function emptyPerms(): PermRow[] {
  return EDITABLE_MODULES.map((key) => ({
    module_key: key,
    can_view: false,
    can_edit: false,
    can_publish: false,
    can_delete: false,
  }));
}

function permsFrom(row: StaffRow): PermRow[] {
  return emptyPerms().map((empty) => row.permissions.find((p) => p.module_key === empty.module_key) ?? empty);
}

function PermissionMatrix({
  permissions,
  onToggle,
  onRow,
}: {
  permissions: PermRow[];
  onToggle: (module: ModuleKey, field: PermField) => void;
  onRow: (module: ModuleKey, on: boolean) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-[8px] border border-[#e3e8ee]">
      <table className="w-full min-w-[600px] text-left text-[13.5px]">
        <thead className="bg-[#f6f8fa]">
          <tr className="text-[#5b6775]">
            <th className="px-4 py-2.5 font-semibold">Section of the website</th>
            {PERM_FIELDS.map((field) => (
              <th key={field} className="px-2 py-2.5 text-center font-semibold" title={PERM_LABELS[field].hint}>
                {PERM_LABELS[field].title}
              </th>
            ))}
            <th className="px-2 py-2.5 text-center font-semibold">Everything</th>
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => {
            const all = PERM_FIELDS.every((f) => p[f]);
            return (
              <tr key={p.module_key} className="border-t border-[#eef1f4]">
                <td className="px-4 py-2 text-[#1f2933]">{MODULE_LABELS[p.module_key]}</td>
                {PERM_FIELDS.map((field) => (
                  <td key={field} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={p[field]}
                      onChange={() => onToggle(p.module_key, field)}
                      className="h-4 w-4 cursor-pointer accent-[#0b1f3a]"
                      aria-label={`${MODULE_LABELS[p.module_key]}: ${PERM_LABELS[field].title}`}
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={all}
                    onChange={() => onRow(p.module_key, !all)}
                    className="h-4 w-4 cursor-pointer accent-[#0b1f3a]"
                    aria-label={`${MODULE_LABELS[p.module_key]}: everything`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OneTimePasswordBox({ issued, onClose }: { issued: Issued; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(issued.password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="ksl-card p-5">
      <h2 className="text-[15px] font-bold text-[#0b1f3a]">
        {issued.isNew ? "Agent created" : "New one-time password"}
      </h2>
      <p className="mt-1 text-[13.5px] text-[#5b6775]">
        Give this to the agent. They will choose their own password the first time they sign in.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[8px] bg-[#f6f8fa] px-4 py-3">
          <p className="text-[12.5px] text-[#6b7785]">Username</p>
          <p className="mt-0.5 font-mono text-[16px] font-semibold text-[#0b1f3a]">{issued.username}</p>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-[8px] bg-[#f6f8fa] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[12.5px] text-[#6b7785]">One-time password</p>
            <p className="mt-0.5 select-all font-mono text-[16px] font-semibold tracking-wide text-[#0b1f3a]">{issued.password}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? <Check className="h-4 w-4 text-[#1b7a3d]" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      <p className="mt-3 text-[12.5px] text-[#6b7785]">This password is shown only once. If it is lost, give them a new one.</p>
      <Button className="mt-4" onClick={onClose}>
        Done
      </Button>
    </section>
  );
}

export function StaffManager() {
  const { toast, confirm } = useFeedback();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [permissions, setPermissions] = useState<PermRow[]>(emptyPerms());

  const load = useCallback(async () => {
    const res = await fetch("/api/staff");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setError(data.error ?? "Could not load the staff list.");
    else setStaff(data.staff);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setUsername("");
    setDisplayName("");
    setEmail("");
    setPermissions(emptyPerms());
    setError(null);
    setIssued(null);
    setPanel({ kind: "create" });
  }

  function openEdit(row: StaffRow) {
    setUsername(row.username);
    setDisplayName(row.display_name);
    setEmail(row.contact_email ?? "");
    setPermissions(permsFrom(row));
    setError(null);
    setIssued(null);
    setPanel({ kind: "edit", row });
  }

  function togglePerm(module: ModuleKey, field: PermField) {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.module_key !== module) return p;
        const next = { ...p, [field]: !p[field] };
        if (field !== "can_view" && next[field]) next.can_view = true;
        if (field === "can_view" && !next.can_view) return { ...next, can_edit: false, can_publish: false, can_delete: false };
        return next;
      })
    );
  }

  function setRow(module: ModuleKey, on: boolean) {
    setPermissions((prev) =>
      prev.map((p) => (p.module_key === module ? { ...p, can_view: on, can_edit: on, can_publish: on, can_delete: on } : p))
    );
  }

  async function run<T>(task: () => Promise<T>) {
    setSaving(true);
    setError(null);
    try {
      return await task();
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = normalizeUsername(username);
    const problem = validateUsername(name) ?? validateEmail(email.trim());
    if (problem) {
      setError(problem);
      return;
    }
    const data = await run(() => sendJson("/api/staff", "POST", { username: name, displayName, email, permissions }));
    if (data) {
      setPanel(null);
      setIssued({ username: name, password: data.oneTimePassword, isNew: true });
      load();
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (panel?.kind !== "edit") return;
    const id = panel.row.id;
    const name = normalizeUsername(username);
    const problem = validateUsername(name) ?? validateEmail(email.trim());
    if (problem) {
      setError(problem);
      return;
    }
    const ok = await run(async () => {
      await sendJson("/api/staff", "PATCH", { id, action: "profile", username: name, displayName, email });
      await sendJson("/api/staff", "PATCH", { id, action: "permissions", permissions });
      return true;
    });
    if (ok) {
      toast(`Changes saved for ${displayName || name}.`);
      setPanel(null);
      load();
    }
  }

  async function resetPassword(row: StaffRow) {
    const ok = await confirm({
      title: `Give ${row.display_name || row.username} a new one-time password?`,
      message: "Their current password will stop working. They will choose a new one when they next sign in.",
      confirmLabel: "Create new password",
    });
    if (!ok) return;
    const data = await run(() => sendJson("/api/staff", "PATCH", { id: row.id, action: "reset_password" }));
    if (data) {
      setPanel(null);
      setIssued({ username: row.username, password: data.oneTimePassword, isNew: false });
      load();
    }
  }

  async function setActive(row: StaffRow, active: boolean) {
    if (!active) {
      const ok = await confirm({
        title: `Suspend ${row.display_name || row.username}?`,
        message: "They will not be able to sign in until you activate the account again.",
        confirmLabel: "Suspend",
        danger: true,
      });
      if (!ok) return;
    }
    const done = await run(() => sendJson("/api/staff", "PATCH", { id: row.id, action: "set_active", active }));
    if (done) {
      toast(active ? `${row.username} can sign in again.` : `${row.username} is suspended.`);
      load();
    }
  }

  async function remove(row: StaffRow) {
    const ok = await confirm({
      title: `Delete ${row.display_name || row.username}?`,
      message: "The account is removed for good. This cannot be undone.",
      confirmLabel: "Delete account",
      danger: true,
    });
    if (!ok) return;
    const done = await run(() => sendJson(`/api/staff?id=${encodeURIComponent(row.id)}`, "DELETE"));
    if (done) {
      toast(`${row.username} was deleted.`);
      load();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading staff…
      </div>
    );
  }

  const accountFields = (
    <FieldGrid className="lg:grid-cols-3">
      <Field label="Username" hint="Used to sign in. Lowercase letters and numbers, no spaces.">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
          autoCapitalize="none"
          spellCheck={false}
          placeholder="e.g. jkamau"
          required
        />
      </Field>
      <Field label="Full name">
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Jane Kamau" />
      </Field>
      <Field label="Contact email" optional>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      </Field>
    </FieldGrid>
  );

  return (
    <div className="flex flex-col gap-4">
      {!panel && !issued && (
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Add agent
          </Button>
        </div>
      )}

      {error && <Notice kind="error">{error}</Notice>}

      {issued && <OneTimePasswordBox issued={issued} onClose={() => setIssued(null)} />}

      {panel?.kind === "create" && (
        <form onSubmit={submitCreate}>
          <FormSection title="New agent" description="A one-time password is created for them when you click Create agent.">
            {accountFields}
            <div>
              <p className="mb-2 text-[13px] font-semibold text-[#1f2933]">What can this agent do?</p>
              <PermissionMatrix permissions={permissions} onToggle={togglePerm} onRow={setRow} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create agent"}
              </Button>
              <Button variant="secondary" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </div>
          </FormSection>
        </form>
      )}

      {panel?.kind === "edit" && (
        <form onSubmit={submitEdit}>
          <FormSection title={`Edit ${panel.row.display_name || panel.row.username}`}>
            {accountFields}
            <div>
              <p className="mb-2 text-[13px] font-semibold text-[#1f2933]">What can this agent do?</p>
              <PermissionMatrix permissions={permissions} onToggle={togglePerm} onRow={setRow} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="secondary" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </div>
          </FormSection>
        </form>
      )}

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-[13.5px]">
          <thead className="bg-[#f6f8fa] text-[#5b6775]">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Can work on</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((row) => (
              <tr key={row.id} className="border-t border-[#eef1f4] align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-[#0b1f3a]">{row.display_name || row.username}</p>
                  <p className="text-[12.5px] text-[#6b7785]">
                    {row.username}
                    {row.contact_email ? ` · ${row.contact_email}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-[#5b6775]">{row.is_super_admin ? "Administrator" : "Agent"}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
                      !row.is_active
                        ? "bg-[#fdecea] text-[#b42318]"
                        : row.must_change_password
                          ? "bg-[#fff4e5] text-[#b45309]"
                          : "bg-[#1b7a3d]/10 text-[#1b7a3d]"
                    )}
                  >
                    {!row.is_active ? "Suspended" : row.must_change_password ? "Waiting for first sign-in" : "Active"}
                  </span>
                </td>
                <td className="max-w-[280px] px-4 py-3 text-[#5b6775]">
                  {row.is_super_admin
                    ? "Everything"
                    : row.permissions
                        .filter((p) => p.can_view)
                        .map((p) => MODULE_LABELS[p.module_key])
                        .join(", ") || "Nothing yet"}
                </td>
                <td className="px-4 py-3">
                  {!row.is_super_admin && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => resetPassword(row)} disabled={saving}>
                        <KeyRound className="h-3.5 w-3.5" /> New password
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setActive(row, !row.is_active)} disabled={saving}>
                        {row.is_active ? "Suspend" : "Activate"}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => remove(row)} disabled={saving} aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
