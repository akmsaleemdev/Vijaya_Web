import { randomUUID } from "node:crypto";
import { z } from "zod";
import { confirmIn } from "@/lib/availability";
import { bookingTransaction } from "@/lib/booking/transaction";

const callback = z.object({ providerRef: z.string().min(1).max(100), outcome: z.enum(["SUCCESS", "PENDING", "FAILED"]) });

/** Sandbox simulation. The configured production gateway must provide its own verified callback. */
export async function POST(req: Request) {
  if (process.env.ENABLE_SANDBOX_PAYMENTS !== "true") return Response.json({ error: "Sandbox payments are disabled." }, { status: 403 });
  const parsed = callback.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid payment callback." }, { status: 422 });
  const { providerRef, outcome } = parsed.data;
  return bookingTransaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { providerRef }, include: { booking: true } });
    if (!payment || payment.provider !== "SANDBOX") return Response.json({ error: "Payment not found." }, { status: 404 });
    if (payment.status === "SUCCESS" || payment.status === "FAILED" || payment.status === "REFUNDED") {
      return Response.json({ ok: true, status: payment.status, duplicate: true });
    }
    if (outcome === "SUCCESS" && (payment.booking.status !== "PENDING_PAYMENT" || !await confirmIn(tx, payment.booking.reference, { paymentRef: providerRef }))) {
      return Response.json({ code: "HOLD_EXPIRED", error: "The booking no longer has an active hold." }, { status: 409 });
    }
    const reason = outcome === "FAILED" ? "The sandbox gateway declined this payment." : null;
    await tx.payment.update({ where: { providerRef }, data: {
      status: outcome, failureReason: reason,
      ...(outcome === "SUCCESS" ? { paidAt: new Date(), transactionId: randomUUID(), method: payment.method ?? "sandbox" } : {}),
    } });
    await tx.auditLog.create({ data: { action: `PAYMENT_${outcome}`, entity: "Payment", entityRef: providerRef } });
    return Response.json({ ok: true, status: outcome, reason });
  });
}
