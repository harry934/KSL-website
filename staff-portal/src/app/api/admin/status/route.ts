import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

const WEBSITE = "https://ksl-website.vercel.app";
const PORTAL = "https://ksl-websitemink.vercel.app/robots.txt";
const SLOW_MS = 1800;

export type ServiceState = "up" | "slow" | "down";
type Probe = { state: ServiceState; ms: number };
type Sample = { t: string; state: ServiceState | "none"; ms: number };

async function probe(run: () => Promise<boolean>): Promise<Probe> {
  const started = Date.now();
  try {
    const ok = await run();
    const ms = Date.now() - started;
    if (!ok) return { state: "down", ms };
    return { state: ms >= SLOW_MS ? "slow" : "up", ms };
  } catch {
    return { state: "down", ms: Date.now() - started };
  }
}

function buckets(rows: { service: string; state: string; latency_ms: number; checked_at: string }[], service: string): Sample[] {
  const now = Date.now();
  const slots: Sample[] = Array.from({ length: 24 }, (_, index) => ({
    t: new Date(now - (23 - index) * 60 * 60 * 1000).toISOString(),
    state: "none",
    ms: 0,
  }));
  for (const row of rows) {
    if (row.service !== service) continue;
    const state = row.state === "up" || row.state === "slow" || row.state === "down" ? row.state : "down";
    const age = now - new Date(row.checked_at).getTime();
    const index = 23 - Math.min(23, Math.max(0, Math.floor(age / (60 * 60 * 1000))));
    slots[index] = { t: row.checked_at, state, ms: row.latency_ms };
  }
  return slots;
}

export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!session.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const [database, website, portal] = await Promise.all([
    probe(async () => {
      const { error } = await admin.from("admin_profiles").select("id").limit(1);
      return !error;
    }),
    probe(async () => {
      const res = await fetch(WEBSITE, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(8000) });
      return res.ok;
    }),
    probe(async () => {
      const res = await fetch(PORTAL, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(8000) });
      return res.ok;
    }),
  ]);

  const checkedAt = new Date().toISOString();
  await admin.from("service_status_log").insert([
    { service: "database", state: database.state, latency_ms: database.ms, checked_at: checkedAt },
    { service: "website", state: website.state, latency_ms: website.ms, checked_at: checkedAt },
    { service: "portal", state: portal.state, latency_ms: portal.ms, checked_at: checkedAt },
  ]);
  const cutoff = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  await admin.from("service_status_log").delete().lt("checked_at", cutoff);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await admin
    .from("service_status_log")
    .select("service, state, latency_ms, checked_at")
    .gte("checked_at", since)
    .order("checked_at", { ascending: true });
  const history = (data ?? []) as { service: string; state: string; latency_ms: number; checked_at: string }[];

  return NextResponse.json(
    {
      database,
      website,
      portal,
      history: {
        database: buckets(history, "database"),
        website: buckets(history, "website"),
        portal: buckets(history, "portal"),
      },
      checkedAt,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
