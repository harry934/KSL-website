"use client";

import { useEffect, useState } from "react";
import { MODULE_GROUPS, MODULE_LABELS, type ModuleKey } from "@/lib/modules";

type Perm = { module_key: ModuleKey; can_view: boolean; can_edit: boolean };
type Person = {
  id: string;
  display_name: string | null;
  username: string | null;
  is_super_admin: boolean;
  is_active: boolean;
  permissions: Perm[];
};

function access(person: Person, key: ModuleKey) {
  if (person.is_super_admin) return "Edit";
  const row = person.permissions?.find((item) => item.module_key === key);
  if (!row?.can_view) return "—";
  return row.can_edit ? "Edit" : "View";
}

export function PermissionsGrid() {
  const [staff, setStaff] = useState<Person[] | null>(null);

  useEffect(() => {
    fetch("/api/staff")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStaff(data?.staff ?? []))
      .catch(() => setStaff([]));
  }, []);

  const columns = MODULE_GROUPS.flatMap((group) => group.modules);
  if (!staff) return null;

  return (
    <section className="ksl-card overflow-x-auto">
      <div className="border-b border-[#eef1f4] px-5 py-4">
        <h2 className="text-[15px] font-bold text-[#0b1f3a]">Who can open each section</h2>
        <p className="mt-1 text-[13px] text-[#6b7785]">View means they can read it. Edit means they can change it.</p>
      </div>
      <table className="w-full min-w-[920px] text-left text-[13px]">
        <thead className="bg-[#f6f8fa] text-[12px] font-semibold text-[#5b6775]">
          <tr>
            <th className="px-4 py-3 font-semibold">Person</th>
            {columns.map((key) => (
              <th key={key} className="px-3 py-3 font-semibold">
                {MODULE_LABELS[key]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staff.map((person) => (
            <tr key={person.id} className="border-t border-[#eef1f4]">
              <th className="px-4 py-3 text-left font-semibold text-[#0b1f3a]">
                {person.display_name || person.username}
                {!person.is_active ? <span className="ml-2 font-normal text-[#98a3b1]">Paused</span> : null}
              </th>
              {columns.map((key) => {
                const value = access(person, key);
                return (
                  <td key={key} className={value === "—" ? "px-3 py-3 text-[#98a3b1]" : "px-3 py-3 text-[#0b1f3a]"}>
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
