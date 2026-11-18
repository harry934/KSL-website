"use client";

import { useEffect, useState } from "react";

type ServiceState = "up" | "slow" | "down";
type Probe = { state: ServiceState; ms: number };
type Sample = { t: string; state: ServiceState | "none"; ms: number };
type Report = {
  database: Probe;
  website: Probe;
  portal: Probe;
  history?: { database: Sample[]; website: Sample[]; portal: Sample[] };
  checkedAt: string;
};

const LABEL: Record<ServiceState, string> = {
  up: "Running",
  slow: "Slow",
  down: "Not responding",
};

function History({ samples }: { samples: Sample[] | undefined }) {
  if (!samples?.length) return null;
  return (
    <div className="status-history" aria-hidden>
      {samples.map((sample) => (
        <i key={sample.t} className={sample.state === "none" ? "" : `is-${sample.state}`} title={sample.state} />
      ))}
    </div>
  );
}

function Card({
  name,
  detail,
  probe,
  history,
}: {
  name: string;
  detail: string;
  probe: Probe | null;
  history?: Sample[];
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
      <History samples={history} />
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
      if (json?.database && json?.website && json?.portal) setReport(json);
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
    <>
      <Card name="PostgreSQL" detail="Database for this portal" probe={report?.database ?? null} history={report?.history?.database} />
      <Card name="Public website" detail="Configured website origin" probe={report?.website ?? null} history={report?.history?.website} />
      <Card name="Staff portal" detail="This application" probe={report?.portal ?? null} history={report?.history?.portal} />
    </>
  );
}
