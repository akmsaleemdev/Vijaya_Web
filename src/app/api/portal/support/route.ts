import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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
    const ticket = await db.supportTicket.create({
      data: {
        bookingRef: session?.reference || null,
        name: session?.reference || "Portal guest",
        email: session?.email || "",
        subject: String(subject).slice(0, 160),
        message: String(message).slice(0, 4000),
      },
    });
    return NextResponse.json({ ok: true, ticketId: ticket.id });
  } catch (e) {
    console.error("portal/support error", e);
    return NextResponse.json({ error: "We couldn't raise your request. Please try again." }, { status: 500 });
  }
}
