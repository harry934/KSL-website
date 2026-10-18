import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/api-auth";
import { openStoredUrl } from "@/lib/stored-file";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requireStaff(null, "view");
  if (error) return error;

  const ref = new URL(req.url).searchParams.get("ref") || "";
  const url = await openStoredUrl(createAdminClient(), ref, 3600);
  if (!url || url === ref) return NextResponse.json({ error: "That file is not available." }, { status: 404 });
  return NextResponse.json({ url });
}
