"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Mail, MessageCircle, Pencil, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGrid, FormSection, Notice } from "@/components/ui/form-bits";
import { useFeedback } from "@/components/ui/feedback";
import { SearchBox, matchesSearch } from "@/components/ui/list-tools";
import { UserAvatar } from "@/components/portal/user-avatar";
import { usePortalSession } from "@/components/portal/session-context";
import { MODULE_GROUPS, MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { SIDEBAR_ITEM_LIMIT, permissionNavLinks } from "@/lib/portal-nav";
import { normalizeUsername, validateEmail, validateUsername } from "@/lib/accounts";
import { sendJson } from "@/lib/upload-client";
import { cn } from "@/lib/cn";

const EDITABLE_MODULES = (Object.keys(MODULE_LABELS) as ModuleKey[]).filter((k) => k !== "staff") as ModuleKey[];
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
type Issued = { username: string; password: string; email: string; phone: string; isNew: boolean; expiresAt: string };

function layoutHint(permissions: PermRow[]) {
  const count = permissionNavLinks({ isSuperAdmin: false, permissions }).length;
  if (count > SIDEBAR_ITEM_LIMIT) return "More than six sections, so this person will have a sidebar.";
  if (count === 0) return "No sections yet, so the dashboard stays empty and there is no sidebar.";
  return "Six sections or fewer, so there is no sidebar. The dashboard shows a card for each section.";
}

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

function applyLevel(row: PermRow, level: "none" | AccessLevel): PermRow {
  if (level === "none") {
    return { ...row, can_view: false, can_edit: false, can_publish: false, can_delete: false };
  }
  return { ...row, ...flagsFor(level) };
}

const LEVEL_CHOICES: { value: "none" | AccessLevel; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "read", label: "Can open" },
  { value: "edit", label: "Can change" },
  { value: "publish", label: "Can publish" },
  { value: "full", label: "Full access" },
];

function levelOf(row: PermRow): "none" | AccessLevel {
  if (row.can_delete) return "full";
  if (row.can_publish) return "publish";
  if (row.can_edit) return "edit";
  if (row.can_view) return "read";
  return "none";
}

function sharedLevel(rows: PermRow[]) {
  if (!rows.length) return "none";
  const first = levelOf(rows[0]);
  return rows.every((row) => levelOf(row) === first) ? first : "";
}

function LevelSelect({
  value,
  label,
  onChange,
}: {
  value: string;
  label: string;
  onChange: (level: "none" | AccessLevel) => void;
}) {
  return (
    <select
      className="h-9 min-w-[148px] rounded-[8px] border border-[#d5dce4] bg-white px-2 text-[13.5px] font-semibold text-[#0b1f3a]"
      aria-label={label}
      value={value}
      onChange={(event) => {
        const level = event.target.value as "none" | AccessLevel;
        if (level) onChange(level);
      }}
    >
      {value === "" && <option value="">Mixed</option>}
      {LEVEL_CHOICES.map((choice) => (
        <option key={choice.value} value={choice.value}>
          {choice.label}
        </option>
      ))}
    </select>
  );
}

function AccessEditor({
  permissions,
  onChange,
}: {
  permissions: PermRow[];
  onChange: (next: PermRow[]) => void;
}) {
  function applyTo(keys: ModuleKey[], level: "none" | AccessLevel) {
    const chosen = new Set(keys);
    onChange(permissions.map((row) => (chosen.has(row.module_key) ? applyLevel(row, level) : row)));
  }

  const rowsFor = (keys: ModuleKey[]) => permissions.filter((row) => keys.includes(row.module_key));

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e3e8ee]">
      <div className="flex items-center justify-between gap-3 bg-[#f6f8fa] px-3 py-2.5">
        <p className="text-[13.5px] font-semibold text-[#0b1f3a]">Every section</p>
        <LevelSelect
          value={sharedLevel(rowsFor(EDITABLE_MODULES))}
          label="Access for every section"
          onChange={(level) => applyTo(EDITABLE_MODULES, level)}
        />
      </div>
      {MODULE_GROUPS.map((group) => {
        const modules = group.modules.filter((key) => key !== "staff");
        if (!modules.length) return null;
        return (
          <div key={group.label}>
            <div className="flex items-center justify-between gap-3 border-t border-[#e3e8ee] bg-[#f8fafc] px-3 py-2">
              <p className="text-[13px] font-semibold text-[#0b1f3a]">{group.label}</p>
              <LevelSelect
                value={sharedLevel(rowsFor(modules))}
                label={`Access for ${group.label}`}
                onChange={(level) => applyTo(modules, level)}
              />
            </div>
            {modules.map((key) => {
              const row = permissions.find((item) => item.module_key === key);
              if (!row) return null;
              return (
                <div key={key} className="flex items-center justify-between gap-3 border-t border-[#eef1f4] px-3 py-2 pl-6">
                  <p className="text-[13.5px] text-[#0b1f3a]">{MODULE_LABELS[key]}</p>
                  <LevelSelect value={levelOf(row)} label={`Access for ${MODULE_LABELS[key]}`} onChange={(level) => applyTo([key], level)} />
                </div>
              );
            })}
          </div>
        );
      })}
      <p className="border-t border-[#eef1f4] px-3 py-2 text-[12.5px] text-[#6b7785]">
        Pick one level. Can change includes opening. Can publish includes changing. Full access can also remove items.
      </p>
    </div>
  );
}

function RoleChoice({ value, onChange }: { value: "agent" | "admin"; onChange: (next: "agent" | "admin") => void }) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-2 text-[13px] font-semibold text-[#1f2933]">Role</legend>
      <label className={cn("rounded-[10px] border px-3 py-3", value === "agent" ? "border-[#0b1f3a] bg-[#f4f7fb]" : "border-[#e3e8ee]")}>
        <input className="mr-2" type="radio" name="staff-role" checked={value === "agent"} onChange={() => onChange("agent")} />
        <span className="font-semibold text-[#0b1f3a]">Agent</span>
        <span className="mt-1 block text-[12.5px] text-[#6b7785]">Access is limited to the sections you choose below.</span>
      </label>
      <label className={cn("rounded-[10px] border px-3 py-3", value === "admin" ? "border-[#0b1f3a] bg-[#f4f7fb]" : "border-[#e3e8ee]")}>
        <input className="mr-2" type="radio" name="staff-role" checked={value === "admin"} onChange={() => onChange("admin")} />
        <span className="font-semibold text-[#0b1f3a]">Administrator</span>
        <span className="mt-1 block text-[12.5px] text-[#6b7785]">Full access to every section, including staff.</span>
      </label>
    </fieldset>
  );
}

function expiryLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-KE", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Nairobi",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function signInText(issued: Issued) {
  const until = expiryLabel(issued.expiresAt);
  return [
    "Kenya Shipyards staff portal",
    "",
    `Username: ${issued.username}`,
    `One-time password: ${issued.password}`,
    "",
    until
      ? `This password stops working at ${until} East Africa Time (10 minutes after it was created).`
      : "This password stops working after 10 minutes.",
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

function mailComposeUrl(kind: "gmail" | "outlook", email: string, body: string) {
  const subject = "Your Kenya Shipyards portal sign in";
  if (kind === "gmail") {
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function OneTimePasswordBox({ issued, onClose }: { issued: Issued; onClose: () => void }) {
  const [copied, setCopied] = useState<"password" | "message" | null>(null);

  const details = signInText(issued);
  const hasEmail = issued.email.includes("@");

  async function copyText(value: string, which: "password" | "message") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  function sendMail(kind: "gmail" | "outlook") {
    if (!hasEmail) return;
    window.open(mailComposeUrl(kind, issued.email, details), "_blank", "noopener");
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
        Give this to the agent.{" "}
        {expiryLabel(issued.expiresAt)
          ? `It stops working at ${expiryLabel(issued.expiresAt)} East Africa Time.`
          : "It stops working after 10 minutes."}{" "}
        {issued.isNew ? "They will choose their own username and password the first time they sign in." : "They will choose a new password the next time they sign in."}
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
          <Button variant="secondary" size="sm" onClick={() => copyText(issued.password, "password")}>
            {copied === "password" ? <Check className="h-4 w-4 text-[#1b7a3d]" /> : <Copy className="h-4 w-4" />}
            {copied === "password" ? "Copied" : "Copy password"}
          </Button>
        </div>
      </div>
      <p className="mt-3 text-[12.5px] text-[#6b7785]">
        These details are shown only once. Gmail and Outlook open a new message with the username and password already written. Press Send there.
        {hasEmail ? "" : " Add a contact email if you want those buttons."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => copyText(details, "message")}>
          <Copy className="h-4 w-4" /> {copied === "message" ? "Message copied" : "Copy message"}
        </Button>
        <Button variant="secondary" onClick={() => sendMail("gmail")} disabled={!hasEmail}>
          <Mail className="h-4 w-4" /> Send with Gmail
        </Button>
        <Button variant="secondary" onClick={() => sendMail("outlook")} disabled={!hasEmail}>
          <Mail className="h-4 w-4" /> Send with Outlook
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
  const session = usePortalSession();
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
  const [role, setRole] = useState<"agent" | "admin">("agent");

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
    setRole("agent");
    setError(null);
    setIssued(null);
    setPanel({ kind: "create" });
  }

  function openEdit(row: StaffRow) {
    setUsername(row.username);
    setDisplayName(row.display_name);
    setEmail(row.contact_email ?? "");
    setPermissions(permsFrom(row));
    setRole(row.is_super_admin ? "admin" : "agent");
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
    const data = await run(() =>
      sendJson("/api/staff", "POST", { displayName, email, permissions, superAdmin: role === "admin" })
    );
    if (data) {
      setPanel(null);
      setIssued({
        username: data.username,
        password: data.oneTimePassword,
        email: email.trim(),
        phone: phone.trim(),
        isNew: true,
        expiresAt: data.expiresAt,
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
      if ((role === "admin") !== panel.row.is_super_admin) {
        await sendJson("/api/staff", "PATCH", { id, action: "set_role", superAdmin: role === "admin" });
      }
      if (role === "agent") {
        await sendJson("/api/staff", "PATCH", { id, action: "permissions", permissions });
      }
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
      message: "Their current password will stop working. The new one lasts 10 minutes, then they must be given another.",
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
        expiresAt: data.expiresAt,
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
      message: "The account goes to the recycle bin. They cannot sign in until you restore it.",
      confirmLabel: "Delete account",
      danger: true,
    });
    if (!ok) return;
    const done = await run(() => sendJson(`/api/staff?id=${encodeURIComponent(row.id)}`, "DELETE"));
    if (done) {
      toast(`${row.username} was moved to the recycle bin.`);
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
            Add staff
          </Button>
          <SearchBox value={query} onChange={setQuery} placeholder="Search by name, username or email" className="sm:w-[300px]" />
        </div>
      )}

      {error && <Notice kind="error">{error}</Notice>}

      {issued && <OneTimePasswordBox issued={issued} onClose={() => setIssued(null)} />}

      {panel?.kind === "create" && (
        <form onSubmit={submitCreate}>
          <FormSection title="New staff account" description="A username and one-time password are created when you save. An administrator can do everything. An agent only gets the sections you set below.">
            <FieldGrid className="lg:grid-cols-3">
              {nameAndEmail}
              <Field label="Mobile number" optional hint="Used if you send the sign-in details on WhatsApp. You can still pick a contact if this is blank.">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="e.g. 0712 345 678" />
              </Field>
            </FieldGrid>
            <RoleChoice value={role} onChange={setRole} />
            {role === "agent" ? (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-[#1f2933]">What can this agent do?</p>
                <p className="mb-2 text-[13px] text-[#5b6775]">{layoutHint(permissions)}</p>
                <AccessEditor permissions={permissions} onChange={setPermissions} />
              </div>
            ) : (
              <p className="text-[13.5px] text-[#5b6775]">This person will be able to open, change, publish, and remove items in every section, and manage other staff.</p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : role === "admin" ? "Create administrator" : "Create agent"}
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
            <RoleChoice value={role} onChange={setRole} />
            {role === "agent" ? (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-[#1f2933]">What can this agent do?</p>
                <p className="mb-2 text-[13px] text-[#5b6775]">{layoutHint(permissions)}</p>
                <AccessEditor permissions={permissions} onChange={setPermissions} />
              </div>
            ) : (
              <p className="text-[13.5px] text-[#5b6775]">Administrators can do everything. Change the role to Agent if you want to limit the sections.</p>
            )}
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
                  {row.id === session?.userId ? (
                    <p className="text-right text-[12.5px] text-[#6b7785]">Your account</p>
                  ) : (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => resetPassword(row)} disabled={saving}>
                        <KeyRound className="h-3.5 w-3.5" /> New password
                      </Button>
                      {!row.is_super_admin && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => setActive(row, !row.is_active)} disabled={saving}>
                            {row.is_active ? "Suspend" : "Activate"}
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => remove(row)} disabled={saving} aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
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
