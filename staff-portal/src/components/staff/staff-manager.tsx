"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Mail, MessageCircle, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGrid, FormSection, Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { SearchBox, matchesSearch } from "@/components/ui/list-tools";
import { UserAvatar } from "@/components/portal/user-avatar";
import { MODULE_GROUPS, MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { normalizeUsername, validateEmail, validateUsername } from "@/lib/accounts";
import { sendJson } from "@/lib/upload-client";
import { cn } from "@/lib/cn";

const EDITABLE_MODULES = (Object.keys(MODULE_LABELS) as ModuleKey[]).filter((k) => k !== "staff");
type PermField = "can_view" | "can_edit" | "can_publish" | "can_delete";

type PermRow = { module_key: ModuleKey } & Record<PermField, boolean>;
type AccessLevel = "read" | "edit" | "publish" | "full";

type StaffRow = {
  id: string;
  username: string;
  display_name: string;
  contact_email: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  must_change_password: boolean;
  avatar_url: string | null;
  permissions: PermRow[];
};

type Panel = { kind: "create" } | { kind: "edit"; row: StaffRow } | null;
type Issued = { username: string; password: string; email: string; phone: string; isNew: boolean };

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

function flagsFor(level: AccessLevel): Record<PermField, boolean> {
  return {
    can_view: true,
    can_edit: level !== "read",
    can_publish: level === "publish" || level === "full",
    can_delete: level === "full",
  };
}

function levelOf(row: PermRow): AccessLevel {
  if (row.can_delete) return "full";
  if (row.can_publish) return "publish";
  if (row.can_edit) return "edit";
  return "read";
}

function AccessEditor({
  permissions,
  onChange,
}: {
  permissions: PermRow[];
  onChange: (next: PermRow[]) => void;
}) {
  const granted = permissions.filter((row) => row.can_view);
  const available = MODULE_GROUPS.map((group) => ({
    label: group.label,
    modules: group.modules.filter((key) => key !== "staff" && !granted.some((row) => row.module_key === key)),
  })).filter((group) => group.modules.length > 0);

  function setLevel(module: ModuleKey, level: string) {
    onChange(
      permissions.map((row) => {
        if (row.module_key !== module) return row;
        if (level === "restricted") {
          return { ...row, can_view: false, can_edit: false, can_publish: false, can_delete: false };
        }
        return { ...row, ...flagsFor(level as AccessLevel) };
      })
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {granted.length === 0 && (
        <p className="text-[13.5px] text-[#6b7785]">No sections yet. Add one to let this agent into the portal.</p>
      )}
      {granted.map((row) => (
        <div
          key={row.module_key}
          className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#e3e8ee] bg-white px-4 py-3"
        >
          <div>
            <p className="text-[14px] font-semibold text-[#0b1f3a]">{MODULE_LABELS[row.module_key]}</p>
            <p className="text-[12.5px] text-[#6b7785]">Sections left off this list stay restricted.</p>
          </div>
          <select
            className="h-[40px] rounded-[8px] border border-[#d5dce4] bg-white px-3 text-[14px] text-[#0b1f3a]"
            value={levelOf(row)}
            aria-label={`${MODULE_LABELS[row.module_key]} access`}
            onChange={(event) => setLevel(row.module_key, event.target.value)}
          >
            <option value="restricted">Restricted</option>
            <option value="read">Read</option>
            <option value="edit">Create and edit</option>
            <option value="publish">Publish</option>
            <option value="full">Full access</option>
          </select>
        </div>
      ))}
      {available.length > 0 && (
        <select
          className="h-[42px] max-w-[320px] rounded-[8px] border border-[#d5dce4] bg-white px-3 text-[14px] text-[#0b1f3a]"
          value=""
          aria-label="Add a section"
          onChange={(event) => {
            const section = event.target.value as ModuleKey;
            if (section) setLevel(section, "read");
          }}
        >
          <option value="">Add a section</option>
          {available.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.modules.map((key) => (
                <option key={key} value={key}>
                  {MODULE_LABELS[key]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  );
}

function signInText(issued: Issued) {
  return [
    "Kenya Shipyards staff portal",
    "",
    `Username: ${issued.username}`,
    `One-time password: ${issued.password}`,
    "",
    issued.isNew
      ? "Sign in and choose your own username and password."
      : "Sign in with this one-time password and choose a new password.",
  ].join("\n");
}

function whatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9 && digits.startsWith("7")) return `254${digits}`;
  return digits;
}

function OneTimePasswordBox({ issued, onClose }: { issued: Issued; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const details = signInText(issued);

  async function copy() {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function sendEmail() {
    const href = `mailto:${issued.email}?subject=${encodeURIComponent("Your Kenya Shipyards portal sign-in")}&body=${encodeURIComponent(details)}`;
    window.location.href = href;
  }

  function sendWhatsApp() {
    const number = whatsAppNumber(issued.phone);
    const text = encodeURIComponent(details);
    window.open(number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`, "_blank", "noopener");
  }

  return (
    <section className="ksl-card p-5">
      <h2 className="text-[15px] font-bold text-[#0b1f3a]">
        {issued.isNew ? "Agent created" : "New one-time password"}
      </h2>
      <p className="mt-1 text-[13.5px] text-[#5b6775]">
        Give this to the agent. {issued.isNew ? "They will choose their own username and password the first time they sign in." : "They will choose a new password the next time they sign in."}
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
      <p className="mt-3 text-[12.5px] text-[#6b7785]">These details are shown only once. If they are lost, create a new password.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={sendEmail}>
          <Mail className="h-4 w-4" /> Send by email
        </Button>
        <Button variant="secondary" onClick={sendWhatsApp}>
          <MessageCircle className="h-4 w-4" /> Send on WhatsApp
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
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
  const [query, setQuery] = useState("");

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
    setPhone("");
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
    if (!displayName.trim()) {
      setError("Write the agent's full name.");
      return;
    }
    const problem = validateEmail(email.trim());
    if (problem) {
      setError(problem);
      return;
    }
    const data = await run(() => sendJson("/api/staff", "POST", { displayName, email, permissions }));
    if (data) {
      setPanel(null);
      setIssued({
        username: data.username,
        password: data.oneTimePassword,
        email: email.trim(),
        phone: phone.trim(),
        isNew: true,
      });
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
      setIssued({
        username: row.username,
        password: data.oneTimePassword,
        email: row.contact_email ?? "",
        phone: "",
        isNew: false,
      });
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

  const shownStaff = staff.filter((row) =>
    matchesSearch(query, row.display_name, row.username, row.contact_email, row.is_super_admin ? "administrator" : "agent")
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[14px] text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading staff…
      </div>
    );
  }

  const nameAndEmail = (
    <>
      <Field label="Full name">
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Jane Kamau" required />
      </Field>
      <Field label="Contact email" optional>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
      </Field>
    </>
  );

  return (
    <div className="flex flex-col gap-4">
      {!panel && !issued && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Add agent
          </Button>
          <SearchBox value={query} onChange={setQuery} placeholder="Search by name, username or email" className="sm:w-[300px]" />
        </div>
      )}

      {error && <Notice kind="error">{error}</Notice>}

      {issued && <OneTimePasswordBox issued={issued} onClose={() => setIssued(null)} />}

      {panel?.kind === "create" && (
        <form onSubmit={submitCreate}>
          <FormSection title="New agent" description="A username and one-time password are created when you click Create agent.">
            <FieldGrid className="lg:grid-cols-3">
              {nameAndEmail}
              <Field label="Mobile number" optional hint="Used if you send the sign-in details on WhatsApp. You can still pick a contact if this is blank.">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="e.g. 0712 345 678" />
              </Field>
            </FieldGrid>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-[#1f2933]">What can this agent do?</p>
              <AccessEditor permissions={permissions} onChange={setPermissions} />
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
            <FieldGrid className="lg:grid-cols-3">
              <Field label="Username" hint="Used to sign in. Lowercase letters and numbers, no spaces.">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </Field>
              {nameAndEmail}
            </FieldGrid>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-[#1f2933]">What can this agent do?</p>
              <AccessEditor permissions={permissions} onChange={setPermissions} />
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
            {shownStaff.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#6b7785]">
                  No results found.{" "}
                  <button type="button" className="font-semibold text-[#0b1f3a] underline" onClick={() => setQuery("")}>
                    Clear search
                  </button>
                </td>
              </tr>
            )}
            {shownStaff.map((row) => (
              <tr key={row.id} className="border-t border-[#eef1f4] align-top">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={row.display_name || row.username} url={row.avatar_url} size={34} />
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0b1f3a]">{row.display_name || row.username}</p>
                      <p className="text-[12.5px] text-[#6b7785]">
                        {row.username}
                        {row.contact_email ? ` · ${row.contact_email}` : ""}
                      </p>
                    </div>
                  </div>
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
