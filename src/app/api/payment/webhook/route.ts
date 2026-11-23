import { bookingMode } from "@/lib/payments/settings";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { confirmIn } from "@/lib/availability";
import { bookingTransaction } from "@/lib/booking/transaction";
import type { Booking, Payment } from "@/lib/db/types";

const callback = z.object({ providerRef: z.string().min(1).max(100), outcome: z.enum(["SUCCESS", "PENDING", "FAILED"]) });

/** Sandbox simulation. The configured production gateway must provide its own verified callback. */
export async function POST(req: Request) {
  const parsed = callback.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid payment callback." }, { status: 422 });
  const { providerRef, outcome } = parsed.data;
  return bookingTransaction(async (tx) => {
    if ((await bookingMode(tx)) !== "SANDBOX") return Response.json({ error: "Sandbox payments are disabled." }, { status: 403 });
    const { rows: [payment] } = await tx.query<Payment & { bookingStatus: string; bookingReference: string }>(
      `SELECT p.*, b."status"::text AS "bookingStatus", b."reference" AS "bookingReference"
       FROM vijaya."Payment" p JOIN vijaya."Booking" b ON b."id" = p."bookingId"
       WHERE p."providerRef" = $1`,
      [providerRef],
    );
    if (!payment || payment.provider !== "SANDBOX") return Response.json({ error: "Payment not found." }, { status: 404 });
    if (payment.status === "SUCCESS" || payment.status === "FAILED" || payment.status === "REFUNDED") {
      return Response.json({ ok: true, status: payment.status, duplicate: true });
    }
    if (outcome === "SUCCESS" && (payment.bookingStatus !== "PENDING_PAYMENT" || !await confirmIn(tx, payment.bookingReference, { paymentRef: providerRef }))) {
      return Response.json({ code: "HOLD_EXPIRED", error: "The booking no longer has an active hold." }, { status: 409 });
    }
    const reason = outcome === "FAILED" ? "The sandbox gateway declined this payment." : null;
    await tx.query(
      `UPDATE vijaya."Payment"
       SET "status" = $2::vijaya."PaymentStatus", "failureReason" = $3,
           "paidAt" = CASE WHEN $2 = 'SUCCESS' THEN now() ELSE "paidAt" END,
           "transactionId" = CASE WHEN $2 = 'SUCCESS' THEN $4 ELSE "transactionId" END,
           "method" = CASE WHEN $2 = 'SUCCESS' THEN COALESCE("method", 'sandbox') ELSE "method" END,
           "updatedAt" = now()
       WHERE "providerRef" = $1`,
      [providerRef, outcome, reason, randomUUID()],
    );
    await tx.query(
      `INSERT INTO vijaya."AuditLog" ("id", "action", "entity", "entityRef", "createdAt")
       VALUES ($1, $2, 'Payment', $3, now())`,
      [randomUUID(), `PAYMENT_${outcome}`, providerRef],
    );
    return Response.json({ ok: true, status: outcome, reason });
  });
}
