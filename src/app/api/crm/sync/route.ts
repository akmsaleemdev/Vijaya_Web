import { NextResponse } from "next/server";
import { crmApplySync } from "@/lib/availability";
import { BOOKING_CONFIG } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * POST /api/crm/sync — VIJAYA CRM → website synchronisation endpoint.
 *
 * Auth: header `x-vicc-key` must match CRM_SYNC_KEY (dev default: vicc-dev-key).
 * The existing CRM is TO BE CONFIRMED — this contract is ready for whichever
 * vendor is chosen. Supports three actions:
 *
 *  { action: "BOOK",    spaceId, date, slot, bookingRef?, customer?, amount? }  — offline booking confirmed in CRM
 *  { action: "BLOCK",   spaceId, date, slot, note? }                          — ops block / maintenance / internal use
 *  { action: "RELEASE", spaceId, date, slot }                                — release an offline block
 *
 * Slots already held online are never overwritten — a conflict is returned
 * and flagged for operations review (never silently lost).
 */
export async function POST(req: Request) {
  const key = req.headers.get(BOOKING_CONFIG.crmSyncHeader);
  const expected = process.env.CRM_SYNC_KEY || "vicc-dev-key";
  if (!key || key !== expected) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  try {
    const raw = await req.text();
    if (!raw) {
      return NextResponse.json({ error: "Request body required." }, { status: 400 });
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (!payload?.action || !payload?.spaceId || !payload?.date || !payload?.slot) {
      return NextResponse.json({ error: "action, spaceId, date and slot are required." }, { status: 400 });
    }
    const result = await crmApplySync(payload);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 409 });
    return NextResponse.json(result);
  } catch (e) {
    console.error("crm/sync error", e);
    return NextResponse.json({ error: "Sync failed." }, { status: 500 });
  }
}

/** GET — integration contract summary for the VICC technical team. */
export async function GET() {
  return NextResponse.json({
    service: "VIJAYA Booking Service — CRM sync endpoint",
    auth: `header ${BOOKING_CONFIG.crmSyncHeader}: <CRM_SYNC_KEY>`,
    actions: ["BOOK", "BLOCK", "RELEASE"],
    payload: {
      action: "BOOK | BLOCK | RELEASE",
      spaceId: "periyar | nila | pamba | kabani | hospitality | boardroom | vip-dining | outdoor-areas | lake-area",
      date: "YYYY-MM-DD",
      slot: "MORNING | AFTERNOON | EVENING | FULL_DAY",
      bookingRef: "optional CRM reference",
      note: "optional",
    },
    notes: [
      "Outbound sync: confirmed online bookings are pushed to the CRM when connected (booking.crmSync flags SYNCED / QUEUED).",
      "Conflicts with online holds are rejected with HTTP 409 and logged for operations review.",
    ],
  });
}
