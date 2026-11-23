import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import { getPortalSession } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

/** POST /api/portal/support — support request from My VIJAYA. */
export async function POST(req: Request) {
  try {
    const session = await getPortalSession();
    const { subject, message } = await req.json();
    if (!subject || !message || String(message).trim().length < 5) {
      return NextResponse.json({ error: "Subject and a short message are required." }, { status: 400 });
    }
    const id = randomUUID();
    await query(
      `INSERT INTO vijaya."SupportTicket" ("id", "bookingRef", "name", "email", "subject", "message", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [
        id, session?.reference || null, session?.reference || "Portal guest", session?.email || "",
        String(subject).slice(0, 160), String(message).slice(0, 4000),
      ],
    );
    return NextResponse.json({ ok: true, ticketId: id });
  } catch (e) {
    console.error("portal/support error", e);
    return NextResponse.json({ error: "We couldn't raise your request. Please try again." }, { status: 500 });
  }
}
