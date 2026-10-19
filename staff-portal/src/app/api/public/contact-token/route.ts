import { issueContactToken } from "@/lib/contact-token";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      challenge: issueContactToken(),
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
