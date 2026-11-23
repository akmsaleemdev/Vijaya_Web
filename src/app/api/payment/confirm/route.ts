import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { Booking, Payment } from "@/lib/db/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/confirm — payment status poll (read-only).
 * The client polls this while a payment is PENDING; the booking is only ever
 * confirmed by the webhook path.
 * Body: { providerRef }
 */
export async function POST(req: Request) {
  try {
    const { providerRef } = await req.json();
    if (!providerRef) return NextResponse.json({ error: "providerRef required" }, { status: 400 });
    const { rows: [payment] } = await query<Payment>(
      `SELECT * FROM vijaya."Payment" WHERE "providerRef" = $1`,
      [String(providerRef)],
    );
    if (!payment) return NextResponse.json({ error: "Unknown payment reference." }, { status: 404 });
    const { rows: [booking] } = await query<Pick<Booking, "status" | "reference">>(
      `SELECT "status"::text AS "status", "reference" FROM vijaya."Booking" WHERE "id" = $1`,
      [payment.bookingId],
    );
    return NextResponse.json({
      status: payment.status,
      amount: payment.amount,
      transactionId: payment.transactionId,
      bookingStatus: booking?.status,
      reference: booking?.reference,
      failureReason: payment.failureReason,
    });
  } catch (e) {
    console.error("payment/confirm error", e);
    return NextResponse.json({ error: "Status check failed." }, { status: 500 });
  }
}
