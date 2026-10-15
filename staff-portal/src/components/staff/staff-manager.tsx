"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { Loader2, UserPlus } from "lucide-react";

const EDITABLE_MODULES = (Object.keys(MODULE_LABELS) as ModuleKey[]).filter((k) => k !== "staff");

type PermRow = {
  module_key: ModuleKey;
  can_view: boolean;
  can_edit: boolean;
  can_publish: boolean;
  can_delete: boolean;
};

type StaffRow = {
  id: string;
  email: string;
  display_name: string;
  is_super_admin: boolean;
  is_active: boolean;
  permissions: PermRow[];
};

function emptyPerms(): PermRow[] {
  return EDITABLE_MODULES.map((key) => ({
    module_key: key,
    can_view: false,
    can_edit: false,
    can_publish: false,
    can_delete: false,
  }));
}

export function StaffManager() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [permissions, setPermissions] = useState<PermRow[]>(emptyPerms());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/staff");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
      setLoading(false);
      return;
    }
    setStaff(data.staff);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName, permissions }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Create failed");
      return;
    }
    setShowForm(false);
    setEmail("");
    setPassword("");
    setDisplayName("");
    setPermissions(emptyPerms());
    load();
  }

  function togglePerm(module: ModuleKey, field: keyof Omit<PermRow, "module_key">) {
    setPermissions((prev) =>
      prev.map((p) => (p.module_key === module ? { ...p, [field]: !p[field] } : p))
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#5c6578]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading staff…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[#5c6578]">Register agents and assign which parts of the website they can change.</p>
        <Button type="button" onClick={() => setShowForm(!showForm)}>
          <UserPlus className="h-4 w-4" />
          Add agent
        </Button>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {showForm && (
        <form
          onSubmit={createStaff}
          className="ksl-card space-y-5 p-6"
        >
          <h2 className="ksl-display text-lg font-semibold text-[#09296C]">New agent</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Display name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#5c6578]">Temporary password (min 8)</label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                minLength={8}
                required
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#DDE5F0] text-xs uppercase text-[#5c6578]">
                  <th className="py-2 pr-4">Module</th>
                  <th className="px-2 py-2">View</th>
                  <th className="px-2 py-2">Edit</th>
                  <th className="px-2 py-2">Publish</th>
                  <th className="px-2 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.module_key} className="border-b border-[#EEF3FA]">
                    <td className="py-2 pr-4 text-[#14213d]">{MODULE_LABELS[p.module_key]}</td>
                    {(["can_view", "can_edit", "can_publish", "can_delete"] as const).map((field) => (
                      <td key={field} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={p[field]}
                          onChange={() => togglePerm(p.module_key, field)}
                          className="h-4 w-4 rounded border-[#DDE5F0] accent-[#0165FC]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create agent"}</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      <div className="ksl-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F7F9FB] text-xs uppercase text-[#5c6578]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Modules</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((row) => (
              <tr key={row.id} className="border-t border-[#EEF3FA]">
                <td className="px-4 py-3 font-medium text-[#09296C]">{row.display_name}</td>
                <td className="px-4 py-3 text-[#5c6578]">{row.email}</td>
                <td className="px-4 py-3">
                  {row.is_super_admin ? (
                    <span className="font-semibold text-[#99792c]">Super admin</span>
                  ) : (
                    <span className="text-[#5c6578]">Agent</span>
                  )}
                </td>
                <td className="px-4 py-3 text-[#5c6578]">
                  {row.is_super_admin
                    ? "All"
                    : row.permissions.filter((p) => p.can_view).map((p) => MODULE_LABELS[p.module_key]).join(", ") ||
                      "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
