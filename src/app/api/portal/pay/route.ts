import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getPortalSession } from "@/lib/portal-auth";
import { bookingTransaction } from "@/lib/booking/transaction";

const input = z.object({ purpose: z.literal("balance").optional(), amount: z.number().optional() });
export async function POST(req: Request) {
  if (process.env.ENABLE_SANDBOX_PAYMENTS !== "true") return Response.json({ error: "Online payments are unavailable." }, { status: 403 });
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL ?? req.url).origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getPortalSession();
  if (!session) return Response.json({ error: "Sign in required." }, { status: 401 });
  const key = req.headers.get("Idempotency-Key");
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (key && key.length > 128)) return Response.json({ error: "Invalid payment request." }, { status: 422 });
  return bookingTransaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { customerEmail: session.email, status: { in: ["CONFIRMED", "PENDING_PAYMENT", "HOLD"] } },
      include: { payments: true }, orderBy: { eventDate: "desc" },
    });
    if (!booking || booking.status !== "CONFIRMED") return Response.json({ error: "Booking is not confirmed." }, { status: 409 });
    const idempotencyKey = `portal:${booking.id}:${key ?? "balance"}`;
    const existing = await tx.payment.findUnique({ where: { idempotencyKey } });
    if (existing) return Response.json({ ok: true, providerRef: existing.providerRef });
    const paid = booking.payments.filter((payment) => payment.status === "SUCCESS").reduce((sum, payment) => sum + payment.amount, 0);
    const amount = booking.baseAmount + booking.weekendUplift + booking.taxAmount - paid;
    if (amount <= 0) return Response.json({ error: "The booking balance is already settled." }, { status: 409 });
    const providerRef = "SBX-" + randomUUID();
    await tx.payment.create({ data: { bookingId: booking.id, provider: "SANDBOX", providerRef, idempotencyKey, amount, status: "SUCCESS", method: "sandbox", paidAt: new Date() } });
    await tx.document.create({ data: { bookingId: booking.id, type: "RECEIPT", title: `Payment Receipt — ${providerRef}` } });
    await tx.auditLog.create({ data: { action: "PAYMENT_SUCCESS", entity: "Payment", entityRef: providerRef } });
    return Response.json({ ok: true, providerRef });
  });
}
