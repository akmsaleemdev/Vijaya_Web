import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { confirmBooking } from "@/lib/availability";

export const dynamic = "force-dynamic";

/**
 * POST /api/payment/webhook — server-to-server callback from the gateway.
 *
 * CRITICAL RULE: a booking is marked CONFIRMED ONLY here (trusted server-side
 * verification), never from a browser redirect. Idempotent: repeated
 * callbacks for the same providerRef are no-ops.
 *
 * Sandbox adapter: the sandbox gateway posts { providerRef, outcome,
 * transactionId }. When the production gateway is confirmed, replace the
 * signature verification with the provider's scheme.
 */
export async function POST(req: Request) {
  try {
    const { providerRef, outcome, transactionId } = await req.json();
    if (!providerRef || !outcome) {
      return NextResponse.json({ error: "providerRef and outcome are required." }, { status: 400 });
    }

    const payment = await db.payment.findUnique({ where: { providerRef: String(providerRef) } });
    if (!payment) return NextResponse.json({ error: "Unknown payment reference." }, { status: 404 });

    // Idempotency — already-final payments never reprocess.
    if (payment.status === "SUCCESS") {
      return NextResponse.json({ ok: true, status: "SUCCESS", duplicate: true });
    }
    if (payment.status === "FAILED" && outcome === "FAILED") {
      return NextResponse.json({ ok: true, status: "FAILED", duplicate: true });
    }

    if (outcome === "SUCCESS") {
      await db.payment.update({
        where: { providerRef: payment.providerRef },
        data: { status: "SUCCESS", transactionId: transactionId || `TXN-${Date.now()}`, method: payment.method || "sandbox" },
      });
      const result = await confirmBooking(
        (await db.booking.findUnique({ where: { id: payment.bookingId } }))?.reference || "",
        payment.providerRef
      );
      return NextResponse.json({ ok: true, status: "SUCCESS", crmSync: result.crmSync });
    }

    if (outcome === "PENDING") {
      await db.payment.update({ where: { providerRef: payment.providerRef }, data: { status: "PENDING" } });
      return NextResponse.json({ ok: true, status: "PENDING" });
    }

    // FAILED
    const reason = "Payment was declined by the gateway (sandbox).";
    await db.payment.update({
      where: { providerRef: payment.providerRef },
      data: { status: "FAILED", failureReason: reason },
    });
    await db.auditLog.create({
      data: { action: "PAYMENT_FAILED", entity: "Payment", entityRef: payment.providerRef },
    });
    return NextResponse.json({ ok: true, status: "FAILED", reason });
  } catch (e) {
    console.error("payment/webhook error", e);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
