import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/api-auth";
import { appendChunk, verifyUploadId } from "@/lib/chunked-upload";
import type { ModuleKey } from "@/lib/modules";

export const maxDuration = 120;

const MAX_RAW_CHUNK = 8 * 1024 * 1024;
const MAX_JSON_CHUNK = 1024 * 1024;

export async function POST(req: NextRequest) {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  const isJson = contentType.includes("application/json");

  let moduleKey: ModuleKey;
  let uploadId: string;
  let signature: string;
  let offset: number;
  let buffer: Buffer;

  if (isJson) {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid upload chunk payload." }, { status: 400 });
    }
    moduleKey = String((body as { module?: string }).module || "gallery") as ModuleKey;
    uploadId = String((body as { uploadId?: string }).uploadId || "").trim();
    signature = String((body as { signature?: string }).signature || "").trim();
    offset = Number((body as { offset?: number }).offset);
    const data = String((body as { data?: string }).data || "");

    const { error, session } = await requireStaff(moduleKey, "edit");
    if (error || !session) return error;
    if (!uploadId || !signature || !Number.isFinite(offset) || offset < 0 || !data) {
      return NextResponse.json({ error: "Invalid upload chunk." }, { status: 400 });
    }
    if (!verifyUploadId(uploadId, session.userId, signature)) {
      return NextResponse.json({ error: "Invalid upload session." }, { status: 403 });
    }
    try {
      buffer = Buffer.from(data, "base64");
    } catch {
      return NextResponse.json({ error: "Invalid upload chunk encoding." }, { status: 400 });
    }
    if (!buffer.byteLength || buffer.byteLength > MAX_JSON_CHUNK) {
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

  moduleKey = (req.headers.get("x-ksl-module") || "gallery") as ModuleKey;
  uploadId = (req.headers.get("x-ksl-upload-id") || "").trim();
  signature = (req.headers.get("x-ksl-upload-sig") || "").trim();
  offset = Number(req.headers.get("x-ksl-offset") || "NaN");

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

  buffer = Buffer.from(await req.arrayBuffer());
  if (!buffer.byteLength || buffer.byteLength > MAX_RAW_CHUNK) {
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
