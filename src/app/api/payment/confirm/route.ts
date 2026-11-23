import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    const payment = await db.payment.findUnique({ where: { providerRef: String(providerRef) } });
    if (!payment) return NextResponse.json({ error: "Unknown payment reference." }, { status: 404 });
    const booking = await db.booking.findUnique({ where: { id: payment.bookingId } });
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
