import { createDatabaseClient } from "@/lib/db-client";
import { maintenanceIsActive, normalizeMaintenance } from "@/lib/site-settings";
import { NextResponse } from "next/server";

const closed = { enabled: false, endsAt: "", message: "", active: false };

export async function GET() {
  try {
    const { data, error } = await createDatabaseClient()
      .from("site_settings")
      .select("value")
      .eq("key", "maintenance")
      .eq("status", "published")
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json(closed, { headers: { "Cache-Control": "no-store" } });
    }
    const maintenance = normalizeMaintenance(data.value);
    return NextResponse.json(
      { ...maintenance, active: maintenanceIsActive(maintenance) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(closed, { headers: { "Cache-Control": "no-store" } });
  }
}
