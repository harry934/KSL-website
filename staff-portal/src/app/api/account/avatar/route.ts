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

type UploadBody = { type: string; size: number; buffer: Buffer };

/** Prefer raw bodies — multipart through this VPS Nginx/Next path can reset the connection. */
async function readUpload(req: NextRequest): Promise<UploadBody | null> {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return null;
    return { type: file.type, size: file.size, buffer: Buffer.from(await file.arrayBuffer()) };
  }
  const type =
    (req.headers.get("x-ksl-content-type") || "").trim() ||
    (contentType.startsWith("application/octet-stream") ? "" : contentType) ||
    "application/octet-stream";
  const buffer = Buffer.from(await req.arrayBuffer());
  if (!buffer.byteLength) return null;
  return { type, size: buffer.byteLength, buffer };
}

/** Uploads or replaces the signed-in person's own profile photo. */
export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    await req.arrayBuffer().catch(() => null);
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const blocked = credentialsCurrent(session);
  if (blocked) {
    await req.arrayBuffer().catch(() => null);
    return blocked;
  }

  const file = await readUpload(req);
  if (!file) return NextResponse.json({ error: "Choose a photo first." }, { status: 400 });
  let ext = TYPES[file.type];
  if (!ext) {
    const name = (req.headers.get("x-ksl-filename") || "").toLowerCase();
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) ext = "jpg";
    else if (name.endsWith(".png")) ext = "png";
    else if (name.endsWith(".webp")) ext = "webp";
  }
  if (!ext) return NextResponse.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "The photo is too large (max 3 MB)." }, { status: 400 });

  const previous = await currentPath(session.userId);
  const path = `avatars/${session.userId}-${crypto.randomUUID()}.${ext}`;
  if (!matchesDeclaredType(file.buffer, ext)) {
    return NextResponse.json({ error: "That file is not a JPG, PNG or WebP photo." }, { status: 400 });
  }
  const admin = createDatabaseClient();
  const contentType = ext === "jpg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/webp";
  try {
    await saveStoredFile("avatars", path, file.buffer, contentType);
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
