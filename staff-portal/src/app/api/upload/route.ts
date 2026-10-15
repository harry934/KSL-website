import { createAdminClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/api-auth";
import type { ModuleKey } from "@/lib/modules";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED = new Set(["news", "gallery", "events", "services", "products", "downloads"]);

export async function POST(req: NextRequest) {
  const moduleKey = (req.headers.get("x-ksl-module") || "gallery") as ModuleKey;
  if (!ALLOWED.has(moduleKey)) {
    return NextResponse.json({ error: "Invalid module" }, { status: 400 });
  }

  const { error, session } = await requireStaff(moduleKey, "edit");
  if (error || !session) return error;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${moduleKey}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage.from("media-public").upload(path, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = admin.storage.from("media-public").getPublicUrl(path);

  return NextResponse.json({
    storage_path: path,
    public_url: pub.publicUrl,
  });
}
