import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getPortalSession } from "@/lib/portal-auth";
import { confirmBooking } from "@/lib/availability";

export const dynamic = "force-dynamic";

/**
 * POST /api/portal/pay — "Pay Now" for a scheduled instalment or balance.
 * Sandbox adapter: creates a payment and confirms it through the same
 * verified webhook path as checkout payments.
 */
export async function POST(req: Request) {
  try {
    const session = await getPortalSession();
    if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

    const { amount, purpose } = await req.json();
    const payAmount = Number(amount);
    if (!payAmount || payAmount < 1) {
      return NextResponse.json({ error: "A valid amount is required." }, { status: 400 });
    }

    const booking = await db.booking.findUnique({ where: { reference: session.reference } });
    if (!booking || booking.customerEmail !== session.email) {
      return NextResponse.json({ error: "Booking not found for this session." }, { status: 404 });
    }

    const providerRef = `SBX-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const payment = await db.payment.create({
      data: {
        bookingId: booking.id,
        provider: "SANDBOX",
        providerRef,
        idempotencyKey: `portal-${providerRef}`,
        amount: Math.round(payAmount),
        status: "SUCCESS",
        method: "sandbox",
        transactionId: `TXN-${Date.now()}`,
      },
    });
    await db.document.create({
      data: { bookingId: booking.id, type: "RECEIPT", title: `Payment Receipt — ${payment.providerRef}` },
    });
    const crm = await confirmBooking(booking.reference, providerRef);
    return NextResponse.json({ ok: true, providerRef, crmSync: crm.crmSync });
  } catch (e) {
    console.error("portal/pay error", e);
    return NextResponse.json({ error: "Payment failed. Please try again." }, { status: 500 });
  }
}
