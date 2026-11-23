import { z } from "zod";
import { dates } from "@/lib/booking/slots";
import { NextResponse } from "next/server";
import { crmApplySync } from "@/lib/availability";
import { BOOKING_CONFIG } from "@/lib/site-config";

const crmInput = z.object({ action: z.enum(["BOOK", "BLOCK", "RELEASE"]), spaceId: z.string().max(100), date: dates, slot: z.string().max(40), bookingRef: z.string().max(100).optional(), note: z.string().max(2000).optional() });
export const dynamic = "force-dynamic";

/**
 * POST /api/crm/sync — VIJAYA CRM → website synchronisation endpoint.
 *
 * Auth: header `x-vicc-key` must match CRM_SYNC_KEY.
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
  const expected = process.env.CRM_SYNC_KEY;
  if (!expected || !key || key !== expected) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  try {
    const payload = crmInput.safeParse(await req.json().catch(() => null));
    if (!payload.success) return NextResponse.json({ error: "Invalid CRM request." }, { status: 422 });
    const result = await crmApplySync(payload.data);
    return NextResponse.json(result, { status: result.ok ? 200 : 409 });
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
