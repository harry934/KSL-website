import { NextRequest, NextResponse } from "next/server";
import { createDatabaseClient } from "@/lib/db-client";
import { credentialsCurrent } from "@/lib/api-auth";
import { matchesDeclaredType } from "@/lib/file-bytes";
import { avatarUrl, getStaffSession } from "@/lib/session";
import { removeStoredFile, saveStoredFile } from "@/lib/storage";

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function currentPath(userId: string) {
  const { data, error } = await createDatabaseClient().from("admin_profiles").select("avatar_path").eq("id", userId).maybeSingle();
  if (error) throw new Error("Could not load the current avatar");
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

  const previous = await currentPath(session.userId);
  const path = `avatars/${session.userId}-${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!matchesDeclaredType(bytes, ext)) {
    return NextResponse.json({ error: "That file is not a JPG, PNG or WebP photo." }, { status: 400 });
  }
  const admin = createDatabaseClient();
  try {
    await saveStoredFile("avatars", path, bytes, file.type);
  } catch (error) {
    console.error("Could not save staff avatar", error);
    return NextResponse.json({ error: "The upload did not work. Please try again." }, { status: 500 });
  }
  const { error: updateError } = await admin.from("admin_profiles").update({ avatar_path: path }).eq("id", session.userId);
  if (updateError) {
    await removeStoredFile("avatars", path);
    return NextResponse.json({ error: "The upload did not work. Please try again." }, { status: 500 });
  }
  if (previous) {
    await removeStoredFile("avatars", previous);
    await removeStoredFile("media-public", previous);
  }
  return NextResponse.json({ avatarUrl: await avatarUrl(path) });
}

export async function DELETE() {
  const session = await getStaffSession();
  if (!session) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  const blocked = credentialsCurrent(session);
  if (blocked) return blocked;

  const admin = createDatabaseClient();
  const previous = await currentPath(session.userId);
  const { error } = await admin.from("admin_profiles").update({ avatar_path: null }).eq("id", session.userId);
  if (error) return NextResponse.json({ error: "Could not remove the avatar. Please try again." }, { status: 500 });
  if (previous) {
    await removeStoredFile("avatars", previous);
    await removeStoredFile("media-public", previous);
  }
  return NextResponse.json({ ok: true });
}
