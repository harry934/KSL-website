"use client";

import { useEffect, useState } from "react";

type ServiceState = "up" | "slow" | "down";
type Probe = { state: ServiceState; ms: number };
type Report = { database: Probe; website: Probe; checkedAt: string };

const LABEL: Record<ServiceState, string> = {
  up: "Running",
  slow: "Slow",
  down: "Not responding",
};

function Card({
  name,
  detail,
  probe,
}: {
  name: string;
  detail: string;
  probe: Probe | null;
}) {
  const state = probe?.state ?? "checking";
  return (
    <article className={`status-card is-${state}`}>
      <div className="status-card-top">
        <span className={`status-live-dot is-${state}`} aria-hidden />
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[#0b1f3a]">{name}</h2>
          <p className="text-[13px] text-[#6b7785]">{detail}</p>
        </div>
      </div>
      <p className="status-card-state">
        {probe ? LABEL[probe.state] : "Checking"}
        {probe ? <span>{probe.ms} ms</span> : null}
      </p>
      <span className="status-card-scan" aria-hidden />
    </article>
  );
}

export function ServiceStatus() {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    let stopped = false;
    async function load() {
      const res = await fetch("/api/admin/status", { cache: "no-store" }).catch(() => null);
      if (!res?.ok || stopped) return;
      const json = (await res.json().catch(() => null)) as Report | null;
      if (json?.database && json?.website) setReport(json);
    }
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 20000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="grid gap-3 sm:grid-cols-2" aria-label="Live service status">
      <Card name="Supabase" detail="Database for this portal" probe={report?.database ?? null} />
      <Card name="Website" detail="ksl-website.vercel.app" probe={report?.website ?? null} />
    </section>
  );
}
