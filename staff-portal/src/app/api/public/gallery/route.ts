import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Gallery stays in the staff portal. The public site does not show it. */
export async function GET() {
  return NextResponse.json(
    { photos: [], videos: [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
