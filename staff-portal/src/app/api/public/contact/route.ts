import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";

const PREFERRED = new Set(["Phone Call", "Email", "Message / WhatsApp", ""]);

function clip(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Send the form again." }, { status: 400 });
  }

  const firstName = clip(body.firstName, 80);
  const otherName = clip(body.otherName, 80);
  const surname = clip(body.surname, 80);
  const email = clip(body.email, 200).toLowerCase();
  const subject = clip(body.subject, 160);
  const message = clip(body.message, 4000);
  const preferred = clip(body.preferredContact, 40);

  if (!firstName || !surname || !subject || !message) {
    return NextResponse.json({ error: "Please complete the required fields." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!PREFERRED.has(preferred)) {
    return NextResponse.json({ error: "Choose a preferred way of communication." }, { status: 400 });
  }
  if (clip(body.website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  const ip = clientIp(req).slice(0, 80);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("contact_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);
  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Please wait a while before sending another message." }, { status: 429 });
  }
  await admin.from("contact_attempts").insert({ ip });

  const { error } = await admin.from("website_messages").insert({
    first_name: firstName,
    other_name: otherName || null,
    surname,
    email,
    subject,
    message,
    preferred_contact: preferred || null,
  });

  if (error) return NextResponse.json({ error: "Could not send the message. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
