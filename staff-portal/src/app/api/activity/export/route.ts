import { NextRequest, NextResponse } from "next/server";
import { getStaffSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULE_LABELS, type ModuleKey } from "@/lib/modules";
import { describeActivity } from "@/lib/activity-words";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function cell(value: string) {
  const text = value.replace(/\r?\n/g, " ");
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const admin = createAdminClient();
  let query = admin
    .from("activity_log")
    .select("module_key, action, entity_type, metadata, created_at, admin_profiles(display_name, username)")
    .eq("actor_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (DATE.test(from)) query = query.gte("created_at", `${from}T00:00:00+03:00`);
  if (DATE.test(to)) query = query.lte("created_at", `${to}T23:59:59.999+03:00`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Could not export the audit log." }, { status: 500 });

  const lines = ["When,Who,What they did,Section"];
  for (const row of data ?? []) {
    const person = row.admin_profiles as { display_name?: string; username?: string } | null;
    const who = person?.display_name || person?.username || "Removed account";
    const section = row.module_key && row.module_key in MODULE_LABELS ? MODULE_LABELS[row.module_key as ModuleKey] : "";
    lines.push(
      [
        cell(new Date(row.created_at).toISOString()),
        cell(who),
        cell(describeActivity(row)),
        cell(section),
      ].join(",")
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ksl-audit-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
