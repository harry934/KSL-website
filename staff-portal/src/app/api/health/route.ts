import { query } from "@/lib/db";
import { NextResponse } from "next/server";

/** Lightweight readiness probe for reverse proxies and operators. */
export async function GET() {
  try {
    await query("SELECT 1 AS ok");
    return NextResponse.json(
      { status: "ok", database: "up" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "error", database: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
