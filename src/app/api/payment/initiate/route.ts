import { bookingMode } from "@/lib/payments/settings";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { bookingTransaction } from "@/lib/booking/transaction";
import type { Booking, Payment } from "@/lib/db/types";

const input = z.object({ reference: z.string().min(1).max(80).toUpperCase(), method: z.string().max(40).optional() });
export async function POST(req: Request) {
  const parsed = input.safeParse(await req.json().catch(() => null));
  const key = req.headers.get("Idempotency-Key");
  if (!parsed.success || (key && key.length > 128)) return Response.json({ error: "Invalid payment request." }, { status: 422 });
  const { reference, method } = parsed.data;
  return bookingTransaction(async (tx) => {
    if ((await bookingMode(tx)) !== "SANDBOX") return Response.json({ error: "Online payment is currently unavailable. Contact the VIJAYA team." }, { status: 403 });
    const { rows: [booking] } = await tx.query<Booking>(
      `SELECT * FROM vijaya."Booking" WHERE "reference" = $1`,
      [reference],
    );
    if (!booking) return Response.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status === "CONFIRMED") return Response.json({ error: "This booking is already confirmed.", alreadyConfirmed: true }, { status: 409 });
    if (booking.status !== "PENDING_PAYMENT" || !booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) {
      return Response.json({ error: "The booking has no active checkout." }, { status: 409 });
    }
    const idempotencyKey = key ? `sandbox:${booking.id}:${key}` : null;
    const byKey = idempotencyKey
      ? (await tx.query<Payment>(`SELECT * FROM vijaya."Payment" WHERE "idempotencyKey" = $1`, [idempotencyKey])).rows[0]
      : undefined;
    const existing = byKey ?? (await tx.query<Payment>(
      `SELECT * FROM vijaya."Payment" WHERE "bookingId" = $1 AND "provider" = 'SANDBOX'
       AND "status"::text = ANY($2::text[]) ORDER BY "createdAt" DESC LIMIT 1`,
      [booking.id, ["INITIATED", "PENDING"]],
    )).rows[0];
    let payment = existing;
    if (!payment) {
      const { rows: [created] } = await tx.query<Payment>(
        `INSERT INTO vijaya."Payment"
          ("id", "bookingId", "provider", "providerRef", "idempotencyKey", "amount", "status", "method", "createdAt", "updatedAt")
         VALUES ($1,$2,'SANDBOX',$3,$4,$5,'INITIATED',$6,now(),now()) RETURNING *`,
        [randomUUID(), booking.id, `SBX-${randomUUID()}`, idempotencyKey ?? randomUUID(), booking.totalPayable, method ?? null],
      );
      if (!created) throw new Error("Payment insert returned no row.");
      payment = created;
      await tx.query(
        `INSERT INTO vijaya."AuditLog" ("id", "action", "entity", "entityRef", "createdAt")
         VALUES ($1,'PAYMENT_INITIATED','Payment',$2,now())`,
        [randomUUID(), payment.providerRef],
      );
    }
    return Response.json({ providerRef: payment.providerRef, amount: Number(payment.amount), checkoutUrl: `/book/sandbox-gateway?ref=${reference}&pay=${payment.providerRef}` });
  });
}
