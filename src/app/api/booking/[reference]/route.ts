import { NextResponse } from "next/server";
import { publicAmounts } from "@/lib/booking/amounts";
import { bookingMode } from "@/lib/payments/settings";
import { query } from "@/lib/db";
import type { Booking, Payment } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/booking/[reference] — checkout + portal status fetch.
 * Returns non-sensitive booking state (no full contact details).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const ref = reference.toUpperCase();
  const { rows: [b] } = await query<Booking & { payments: Payment[]; requiresApproval: boolean }>(
    `SELECT b.*, s."requiresApproval",
       COALESCE((SELECT json_agg(p ORDER BY p."createdAt" DESC) FROM vijaya."Payment" p WHERE p."bookingId" = b."id"), '[]'::json) AS payments
     FROM vijaya."Booking" b
     JOIN vijaya."Space" s ON s."id" = b."spaceId"
     WHERE b."reference" = $1`,
    [ref],
  );
  if (!b) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  return NextResponse.json({
    reference: b.reference,
    bookingMode: b.requiresApproval ? "OFFLINE" : await bookingMode(),
    spaceName: b.spaceName,
    eventType: b.eventType,
    eventDate: b.eventDate,
    slot: b.slot,
    guests: b.guests,
    status: b.status,
    crmSync: b.crmSync,
    holdExpiresAt: b.holdExpiresAt,
    amounts: publicAmounts(b),
    payments: b.payments.map((p) => ({
      providerRef: p.providerRef,
      amount: Number(p.amount),
      status: p.status,
      method: p.method,
      transactionId: p.transactionId,
      createdAt: p.createdAt,
    })),
    customerFirstName: b.customerName && b.customerName.startsWith("—") ? null : b.customerName.split(" ")[0],
  });
}
