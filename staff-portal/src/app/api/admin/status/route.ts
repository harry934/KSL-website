import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

const WEBSITE = "https://ksl-website.vercel.app";
const SLOW_MS = 1800;

export type ServiceState = "up" | "slow" | "down";

async function probe(run: () => Promise<boolean>): Promise<{ state: ServiceState; ms: number }> {
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

export async function GET() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  if (!session.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [database, website] = await Promise.all([
    probe(async () => {
      const { error } = await createAdminClient().from("admin_profiles").select("id").limit(1);
      return !error;
    }),
    probe(async () => {
      const res = await fetch(WEBSITE, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(8000) });
      return res.ok;
    }),
  ]);

  return NextResponse.json(
    { database, website, checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
