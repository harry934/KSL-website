"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { normalizeUsername, validatePassword, validateUsername } from "@/lib/accounts";
import { KeyRound, Loader2, Pencil, Trash2, UserPlus } from "lucide-react";

const EDITABLE_MODULES = (Object.keys(MODULE_LABELS) as ModuleKey[]).filter((k) => k !== "staff");
const PERM_FIELDS = ["can_view", "can_edit", "can_publish", "can_delete"] as const;
type PermField = (typeof PERM_FIELDS)[number];

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

type Panel =
  | { kind: "create" }
  | { kind: "edit"; row: StaffRow }
  | { kind: "reset"; row: StaffRow }
  | null;

const label = "mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-[#5b6775]";

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
  return EDITABLE_MODULES.map(
    (key) => row.permissions.find((p) => p.module_key === key) ?? { ...emptyPerms().find((p) => p.module_key === key)! }
  );
}

function generatePassword() {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = letters + digits;
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (n) => all[n % all.length]);
  chars[0] = letters[bytes[0] % letters.length];
  chars[11] = digits[bytes[11] % digits.length];
  return chars.join("");
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-[#d7dde5] text-[11px] uppercase tracking-[0.06em] text-[#5b6775]">
            <th className="py-2 pr-4">Module</th>
            <th className="px-2 py-2 text-center">View</th>
            <th className="px-2 py-2 text-center">Edit</th>
            <th className="px-2 py-2 text-center">Publish</th>
            <th className="px-2 py-2 text-center">Delete</th>
            <th className="px-2 py-2 text-center">All</th>
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => {
            const all = PERM_FIELDS.every((f) => p[f]);
            return (
              <tr key={p.module_key} className="border-b border-[#eef2f6]">
                <td className="py-2 pr-4 text-[#1f2933]">{MODULE_LABELS[p.module_key]}</td>
                {PERM_FIELDS.map((field) => (
                  <td key={field} className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={p[field]}
                      onChange={() => onToggle(p.module_key, field)}
                      className="h-4 w-4 accent-[#0b1f3a]"
                      aria-label={`${MODULE_LABELS[p.module_key]} ${field.replace("can_", "")}`}
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={all}
                    onChange={() => onRow(p.module_key, !all)}
                    className="h-4 w-4 accent-[#c5a028]"
                    aria-label={`All rights for ${MODULE_LABELS[p.module_key]}`}
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

export function StaffManager() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<PermRow[]>(emptyPerms());

  const load = useCallback(async () => {
    const res = await fetch("/api/staff");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
    } else {
      setStaff(data.staff);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setUsername("");
    setDisplayName("");
    setEmail("");
    setPassword(generatePassword());
    setPermissions(emptyPerms());
    setError(null);
    setNotice(null);
    setPanel({ kind: "create" });
  }

  function openEdit(row: StaffRow) {
    setDisplayName(row.display_name);
    setEmail(row.contact_email ?? "");
    setPermissions(permsFrom(row));
    setError(null);
    setNotice(null);
    setPanel({ kind: "edit", row });
  }

  function openReset(row: StaffRow) {
    setPassword(generatePassword());
    setError(null);
    setNotice(null);
    setPanel({ kind: "reset", row });
  }

  function togglePerm(module: ModuleKey, field: PermField) {
    setPermissions((prev) => prev.map((p) => (p.module_key === module ? { ...p, [field]: !p[field] } : p)));
  }

  function setRow(module: ModuleKey, on: boolean) {
    setPermissions((prev) =>
      prev.map((p) =>
        p.module_key === module ? { ...p, can_view: on, can_edit: on, can_publish: on, can_delete: on } : p
      )
    );
  }

  async function send(method: string, body?: unknown, query = "") {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/staff${query}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return false;
    }
    return true;
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = normalizeUsername(username);
    const problem = validateUsername(name) ?? validatePassword(password);
    if (problem) {
      setError(problem);
      return;
    }
    if (await send("POST", { username: name, displayName, email, password, permissions })) {
      setNotice(`Agent created. Share the username "${name}" and temporary password "${password}" privately — they will be asked to change it at first sign-in.`);
      setPanel(null);
      load();
    }
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (panel?.kind !== "edit") return;
    const id = panel.row.id;
    const ok =
      (await send("PATCH", { id, action: "profile", displayName, email })) &&
      (await send("PATCH", { id, action: "permissions", permissions }));
    if (ok) {
      setNotice(`Saved changes for ${panel.row.username}.`);
      setPanel(null);
      load();
    }
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (panel?.kind !== "reset") return;
    const problem = validatePassword(password);
    if (problem) {
      setError(problem);
      return;
    }
    if (await send("PATCH", { id: panel.row.id, action: "reset_password", password })) {
      setNotice(`Password reset for ${panel.row.username}. Temporary password: "${password}". They must change it at next sign-in.`);
      setPanel(null);
      load();
    }
  }

  async function setActive(row: StaffRow, active: boolean) {
    if (!active && !window.confirm(`Suspend ${row.username}? They will be signed out of the portal.`)) return;
    if (await send("PATCH", { id: row.id, action: "set_active", active })) load();
  }

  async function remove(row: StaffRow) {
    if (!window.confirm(`Delete ${row.username} permanently? This cannot be undone.`)) return;
    if (await send("DELETE", undefined, `?id=${encodeURIComponent(row.id)}`)) {
      setNotice(`${row.username} was deleted.`);
      load();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5b6775]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading staff…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <div className="ksl-card flex flex-wrap items-center justify-between gap-3 p-[14px]">
        <p className="text-sm text-[#5b6775]">
          Agents sign in with their <strong>username</strong> (or email, if one is set). Email is optional.
        </p>
        <Button type="button" onClick={openCreate}>
          <UserPlus className="h-4 w-4" />
          Add agent
        </Button>
      </div>

      {error && <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-[#b42318]">{error}</p>}
      {notice && <p className="border border-green-200 bg-green-50 px-3 py-2 text-sm text-[#1b7a3d]">{notice}</p>}

      {panel?.kind === "create" && (
        <form onSubmit={submitCreate} className="ksl-card space-y-5 border-t-[3px] border-t-[#c5a028] p-[18px]">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">New agent</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Username *</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                autoCapitalize="none"
                spellCheck={false}
                placeholder="e.g. jkamau"
                required
              />
            </div>
            <div>
              <label className={label}>Full name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Kamau" />
            </div>
            <div>
              <label className={label}>Email (optional)</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
            <div>
              <label className={label}>Temporary password *</label>
              <div className="flex gap-2">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
                <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                  Generate
                </Button>
              </div>
            </div>
          </div>
          <PermissionMatrix permissions={permissions} onToggle={togglePerm} onRow={setRow} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create agent"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPanel(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {panel?.kind === "edit" && (
        <form onSubmit={submitEdit} className="ksl-card space-y-5 border-t-[3px] border-t-[#c5a028] p-[18px]">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Edit {panel.row.username}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Full name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div>
              <label className={label}>Email (optional)</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
          </div>
          <PermissionMatrix permissions={permissions} onToggle={togglePerm} onRow={setRow} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPanel(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {panel?.kind === "reset" && (
        <form onSubmit={submitReset} className="ksl-card max-w-lg space-y-4 border-t-[3px] border-t-[#c5a028] p-[18px]">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">Reset password for {panel.row.username}</h2>
          <div>
            <label className={label}>New temporary password</label>
            <div className="flex gap-2">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
              <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                Generate
              </Button>
            </div>
            <p className="mt-1 text-[12px] text-[#5b6775]">They will be asked to choose their own password at next sign-in.</p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Reset password"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPanel(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="ksl-card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="bg-[#f4f6f8] text-[11px] uppercase tracking-[0.06em] text-[#5b6775]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Modules</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((row) => (
              <tr key={row.id} className="border-t border-[#eef2f6] align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-[#0b1f3a]">{row.display_name || row.username}</p>
                  <p className="text-[12px] text-[#5b6775]">@{row.username}</p>
                </td>
                <td className="px-4 py-3 text-[#5b6775]">{row.contact_email || "—"}</td>
                <td className="px-4 py-3">
                  {row.is_super_admin ? (
                    <span className="font-semibold text-[#8a6d12]">Super admin</span>
                  ) : (
                    <span className="text-[#5b6775]">Agent</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.is_active ? (
                    <span className="text-[#1b7a3d]">{row.must_change_password ? "Active · temp password" : "Active"}</span>
                  ) : (
                    <span className="text-[#b42318]">Suspended</span>
                  )}
                </td>
                <td className="max-w-[260px] px-4 py-3 text-[#5b6775]">
                  {row.is_super_admin
                    ? "All"
                    : row.permissions
                        .filter((p) => p.can_view)
                        .map((p) => MODULE_LABELS[p.module_key])
                        .join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  {!row.is_super_admin && (
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button type="button" variant="ghost" className="px-2 py-1" onClick={() => openEdit(row)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" className="px-2 py-1" onClick={() => openReset(row)} title="Reset password">
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-2 py-1"
                        onClick={() => setActive(row, !row.is_active)}
                      >
                        {row.is_active ? "Suspend" : "Activate"}
                      </Button>
                      <Button type="button" variant="ghost" className="px-2 py-1 text-[#b42318]" onClick={() => remove(row)} title="Delete">
                        <Trash2 className="h-4 w-4" />
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
