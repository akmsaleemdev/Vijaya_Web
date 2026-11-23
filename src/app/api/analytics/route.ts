import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "hero_check_date_click", "event_type_selected", "check_date_started", "date_selected", "slot_selected",
  "guest_count_selected", "venue_viewed", "venue_360_started", "availability_checked", "booking_started",
  "temporary_hold_created", "checkout_started", "payment_started", "payment_success", "payment_failed",
  "booking_confirmed", "venue_visit_started", "venue_visit_submitted", "plan_event_submitted",
  "whatsapp_clicked", "phone_clicked", "global_desk_enquiry", "story_viewed", "concierge_opened", "concierge_message",
]);

/** POST /api/analytics — fire-and-forget event store (sendBeacon friendly). */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "");
    if (!ALLOWED.has(name)) return NextResponse.json({ ok: true, skipped: true });
    await db.analyticsEvent.create({
      data: {
        name,
        path: body?.path ? String(body.path).slice(0, 200) : null,
        sessionId: body?.sessionId ? String(body.sessionId).slice(0, 60) : null,
        metaJson: body?.meta ? JSON.stringify(body.meta).slice(0, 2000) : null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Analytics must never fail the UX.
    return NextResponse.json({ ok: true });
  }
}
