import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { credentialsCurrent } from "@/lib/api-auth";
import { matchesDeclaredType } from "@/lib/file-bytes";
import { avatarUrl, getStaffSession } from "@/lib/session";

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function currentPath(userId: string) {
  const { data } = await createAdminClient().from("admin_profiles").select("avatar_path").eq("id", userId).maybeSingle();
  return (data?.avatar_path as string | null) ?? null;
}

/** Uploads or replaces the signed-in person's own profile photo. */
export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const blocked = credentialsCurrent(session);
  if (blocked) return blocked;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo first." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "The photo is too large (max 3 MB)." }, { status: 400 });

  const admin = createAdminClient();
  const previous = await currentPath(session.userId);
  const path = `avatars/${session.userId}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!matchesDeclaredType(bytes, ext)) {
    return NextResponse.json({ error: "That file is not a JPG, PNG or WebP photo." }, { status: 400 });
  }
  const { error: upErr } = await admin.storage.from("avatars").upload(path, bytes, {
    contentType: file.type,
    cacheControl: "3600",
  });
  if (upErr) {
    const fallback = `avatars/${session.userId}-${Date.now()}.${ext}`;
    const legacy = await admin.storage.from("media-public").upload(fallback, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
    });
    if (legacy.error) return NextResponse.json({ error: "The upload did not work. Please try again." }, { status: 500 });
    await admin.from("admin_profiles").update({ avatar_path: fallback }).eq("id", session.userId);
    if (previous) await admin.storage.from("media-public").remove([previous]);
    return NextResponse.json({ avatarUrl: await avatarUrl(fallback) });
  }

  await admin.from("admin_profiles").update({ avatar_path: path }).eq("id", session.userId);
  if (previous) {
    await admin.storage.from("avatars").remove([previous]);
    await admin.storage.from("media-public").remove([previous]);
  }
  return NextResponse.json({ avatarUrl: await avatarUrl(path) });
}

export async function DELETE() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const blocked = credentialsCurrent(session);
  if (blocked) return blocked;

  const admin = createAdminClient();
  const previous = await currentPath(session.userId);
  await admin.from("admin_profiles").update({ avatar_path: null }).eq("id", session.userId);
  if (previous) {
    await admin.storage.from("avatars").remove([previous]);
    await admin.storage.from("media-public").remove([previous]);
  }
  return NextResponse.json({ ok: true });
}
