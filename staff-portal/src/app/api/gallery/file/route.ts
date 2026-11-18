import { createDatabaseClient } from "@/lib/db-client";
import { requireStaff } from "@/lib/api-auth";
import { loadStoredFile } from "@/lib/storage";
import { NextRequest, NextResponse } from "next/server";

function galleryPath(value: string | null | undefined) {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith("gallery/") || path.includes("..") || !/^gallery\/[\w./-]+$/.test(path)) return null;
  return path;
}

function pathFromPublicUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    const pathname = new URL(value).pathname;
    const marker = "/storage/v1/object/public/media-public/";
    const at = pathname.indexOf(marker);
    if (at < 0) return null;
    return galleryPath(decodeURIComponent(pathname.slice(at + marker.length)));
  } catch {
    return null;
  }
}

/** Streams a gallery photo through the portal so it can be trimmed without a cross-origin canvas. */
export async function GET(req: NextRequest) {
  const { error } = await requireStaff("gallery", "edit");
  if (error) return error;

  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Nothing selected." }, { status: 400 });

  const admin = createDatabaseClient();
  const { data: row } = await admin.from("gallery_photos").select("storage_path, public_url").eq("id", id).maybeSingle();
  const path = galleryPath(row?.storage_path) || pathFromPublicUrl(row?.public_url);
  if (!path) return NextResponse.json({ error: "That photo could not be opened for trimming." }, { status: 404 });

  const data = await loadStoredFile("media-public", path);
  if (!data) return NextResponse.json({ error: "That photo could not be opened for trimming." }, { status: 404 });
  return new NextResponse(data.bytes, {
    headers: {
      "Content-Type": data.contentType || "image/jpeg",
      "Cache-Control": "private, no-store",
    },
  });
}
