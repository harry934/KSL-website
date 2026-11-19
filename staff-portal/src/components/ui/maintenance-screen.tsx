"use client";

import { useEffect, useState } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { appPath } from "@/lib/base-path";

const UNITS = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "minutes", label: "Minutes" },
  { key: "seconds", label: "Seconds" },
] as const;

export function maintenanceClock(endsAt: string, now = Date.now()) {
  if (!endsAt) return null;
  const ends = Date.parse(`${endsAt}:00+03:00`);
  if (Number.isNaN(ends)) return null;
  const total = Math.max(0, Math.floor((ends - now) / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: total === 0,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function MaintenanceScreen({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const clock = maintenanceClock(endsAt, now);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <img className="w-40 grayscale dark:invert" src={appPath("/brand/maintenance.svg")} alt="" />
        </EmptyMedia>
        <EmptyTitle>Under Maintenance</EmptyTitle>
        <EmptyDescription>
          We&apos;re currently performing scheduled maintenance. We should be back shortly. Thank you for your patience.
        </EmptyDescription>
      </EmptyHeader>
      {clock && (
        <div className="flex flex-wrap justify-center gap-2" aria-live="polite">
          {UNITS.map((unit) => (
            <div key={unit.key} className="min-w-16 rounded-lg border border-dashed border-[#d5dce4] bg-white px-2 py-2">
              <div className="text-[22px] font-semibold tabular-nums text-[#0b1f3a]">{pad(clock[unit.key])}</div>
              <div className="mt-0.5 text-[11px] uppercase tracking-wide text-[#6b7785]">{unit.label}</div>
            </div>
          ))}
        </div>
      )}
    </Empty>
  );
}
