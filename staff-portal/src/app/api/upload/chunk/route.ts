import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { appendChunk, verifyUploadId } from "@/lib/chunked-upload";
import type { ModuleKey } from "@/lib/modules";

export const maxDuration = 120;

const MAX_CHUNK = 2 * 1024 * 1024 + 64 * 1024;

export async function POST(req: NextRequest) {
  const moduleKey = (req.headers.get("x-ksl-module") || "gallery") as ModuleKey;
  const uploadId = (req.headers.get("x-ksl-upload-id") || "").trim();
  const signature = (req.headers.get("x-ksl-upload-sig") || "").trim();
  const offset = Number(req.headers.get("x-ksl-offset") || "NaN");

  const { error, session } = await requireStaff(moduleKey, "edit");
  if (error || !session) {
    await req.arrayBuffer().catch(() => null);
    return error;
  }

  if (!uploadId || !signature || !Number.isFinite(offset) || offset < 0) {
    await req.arrayBuffer().catch(() => null);
    return NextResponse.json({ error: "Invalid upload chunk." }, { status: 400 });
  }
  if (!verifyUploadId(uploadId, session.userId, signature)) {
    await req.arrayBuffer().catch(() => null);
    return NextResponse.json({ error: "Invalid upload session." }, { status: 403 });
  }

  const buffer = Buffer.from(await req.arrayBuffer());
  if (!buffer.byteLength || buffer.byteLength > MAX_CHUNK) {
    return NextResponse.json({ error: "Invalid upload chunk size." }, { status: 400 });
  }

  try {
    const meta = await appendChunk(uploadId, session.userId, offset, buffer);
    return NextResponse.json({ ok: true, received: meta.received, size: meta.size });
  } catch (err) {
    const message = err instanceof Error ? err.message : "The upload did not work. Please try again.";
    console.error("Chunk append failed", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
