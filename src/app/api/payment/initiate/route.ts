import { randomUUID } from "node:crypto";
import { z } from "zod";
import { bookingTransaction } from "@/lib/booking/transaction";

const input = z.object({ reference: z.string().min(1).max(80).toUpperCase(), method: z.string().max(40).optional() });
export async function POST(req: Request) {
  if (process.env.ENABLE_SANDBOX_PAYMENTS !== "true") return Response.json({ error: "Online payment is currently unavailable. Contact the VIJAYA team." }, { status: 403 });
  const parsed = input.safeParse(await req.json().catch(() => null));
  const key = req.headers.get("Idempotency-Key");
  if (!parsed.success || (key && key.length > 128)) return Response.json({ error: "Invalid payment request." }, { status: 422 });
  const { reference, method } = parsed.data;
  return bookingTransaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { reference } });
    if (!booking) return Response.json({ error: "Booking not found." }, { status: 404 });
    if (booking.status === "CONFIRMED") return Response.json({ error: "This booking is already confirmed.", alreadyConfirmed: true }, { status: 409 });
    if (booking.status !== "PENDING_PAYMENT" || !booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) {
      return Response.json({ error: "The booking has no active checkout." }, { status: 409 });
    }
    const idempotencyKey = key ? `sandbox:${booking.id}:${key}` : null;
    const existing = (idempotencyKey ? await tx.payment.findUnique({ where: { idempotencyKey } }) : null)
      ?? await tx.payment.findFirst({ where: { bookingId: booking.id, provider: "SANDBOX", status: { in: ["INITIATED", "PENDING"] } } });
    const payment = existing ?? await tx.payment.create({ data: {
      bookingId: booking.id, provider: "SANDBOX", providerRef: `SBX-${randomUUID()}`,
      idempotencyKey: idempotencyKey ?? randomUUID(), amount: booking.totalPayable, status: "INITIATED", method,
    } });
    if (!existing) await tx.auditLog.create({ data: { action: "PAYMENT_INITIATED", entity: "Payment", entityRef: payment.providerRef } });
    return Response.json({ providerRef: payment.providerRef, amount: payment.amount, checkoutUrl: `/book/sandbox-gateway?ref=${reference}&pay=${payment.providerRef}` });
  });
}
