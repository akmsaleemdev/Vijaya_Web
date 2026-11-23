import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/initiate
 * Creates a payment intent at the (sandbox) gateway. The real gateway is
 * TO BE CONFIRMED with VICC — this route is structured so only the
 * provider adapter changes when the production gateway lands.
 *
 * Body: { reference, method? }
 * Returns: { providerRef, amount, checkoutUrl }
 */
export async function POST(req: Request) {
  try {
    const { reference, method } = await req.json();
    if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });

    const booking = await db.booking.findUnique({ where: { reference: String(reference).toUpperCase() } });
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status === "CONFIRMED") {
      return NextResponse.json({ error: "This booking is already confirmed.", alreadyConfirmed: true }, { status: 409 });
    }
    if (booking.status !== "PENDING_PAYMENT" && booking.status !== "HOLD") {
      return NextResponse.json({ error: "This booking cannot accept a payment right now.", code: booking.status }, { status: 409 });
    }

    const idempotencyKey = `init-${booking.reference}-${booking.eventDate}-${booking.slot}`;
    const existing = await db.payment.findUnique({ where: { idempotencyKey } });
    if (existing && existing.status !== "FAILED") {
      return NextResponse.json({
        providerRef: existing.providerRef,
        amount: existing.amount,
        checkoutUrl: `/book/sandbox-gateway?ref=${booking.reference}&pay=${existing.providerRef}`,
      });
    }

    const providerRef = `SBX-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    await db.payment.create({
      data: {
        bookingId: booking.id,
        provider: "SANDBOX",
        providerRef,
        idempotencyKey,
        amount: booking.totalPayable,
        status: "INITIATED",
        method: method || null,
      },
    });
    await db.auditLog.create({
      data: { action: "PAYMENT_INITIATED", entity: "Payment", entityRef: providerRef, detailJson: JSON.stringify({ booking: booking.reference, amount: booking.totalPayable }) },
    });

    return NextResponse.json({
      providerRef,
      amount: booking.totalPayable,
      checkoutUrl: `/book/sandbox-gateway?ref=${booking.reference}&pay=${providerRef}`,
    });
  } catch (e) {
    console.error("payment/initiate error", e);
    return NextResponse.json({ error: "Payment initiation failed. Please try again." }, { status: 500 });
  }
}
