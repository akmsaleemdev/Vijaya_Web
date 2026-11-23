import { totalContract } from "@/lib/booking/amounts";
import { bookingMode } from "@/lib/payments/settings";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getPortalSession } from "@/lib/portal-auth";
import { bookingTransaction } from "@/lib/booking/transaction";
import type { Booking, Payment } from "@/lib/db/types";

const input = z.object({ purpose: z.literal("balance").optional(), amount: z.number().optional() });
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(process.env.NEXTAUTH_URL ?? req.url).origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getPortalSession();
  if (!session) return Response.json({ error: "Sign in required." }, { status: 401 });
  const key = req.headers.get("Idempotency-Key");
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (key && key.length > 128)) return Response.json({ error: "Invalid payment request." }, { status: 422 });
  return bookingTransaction(async (tx) => {
    if ((await bookingMode(tx)) !== "SANDBOX") return Response.json({ error: "Online payments are unavailable." }, { status: 403 });
    const { rows: [booking] } = await tx.query<Booking & { payments: Payment[] }>(
      `SELECT b.*,
         COALESCE((SELECT json_agg(p) FROM vijaya."Payment" p WHERE p."bookingId" = b."id"), '[]'::json) AS payments
       FROM vijaya."Booking" b
       WHERE lower(b."customerEmail") = $1 AND b."status"::text = ANY($2::text[])
       ORDER BY b."eventDate" DESC LIMIT 1`,
      [session.email, ["CONFIRMED", "PENDING_PAYMENT", "PENDING_HOLD"]],
    );
    if (!booking || booking.status !== "CONFIRMED") return Response.json({ error: "Booking is not confirmed." }, { status: 409 });
    const idempotencyKey = `portal:${booking.id}:${key ?? "balance"}`;
    const { rows: [existing] } = await tx.query<Payment>(
      `SELECT * FROM vijaya."Payment" WHERE "idempotencyKey" = $1`,
      [idempotencyKey],
    );
    if (existing) return Response.json({ ok: true, providerRef: existing.providerRef });
    const paid = booking.payments.filter((payment) => payment.status === "SUCCESS").reduce((sum, payment) => sum + Number(payment.amount), 0);
    const amount = totalContract(booking) - paid;
    if (amount <= 0) return Response.json({ error: "The booking balance is already settled." }, { status: 409 });
    const providerRef = "SBX-" + randomUUID();
    await tx.query(
      `INSERT INTO vijaya."Payment"
        ("id", "bookingId", "provider", "providerRef", "idempotencyKey", "amount", "status", "method", "paidAt", "createdAt", "updatedAt")
       VALUES ($1,$2,'SANDBOX',$3,$4,$5,'SUCCESS','sandbox',now(),now(),now())`,
      [randomUUID(), booking.id, providerRef, idempotencyKey, amount],
    );
    await tx.query(
      `INSERT INTO vijaya."Document" ("id", "bookingId", "type", "title", "createdAt")
       VALUES ($1,$2,'RECEIPT',$3,now())`,
      [randomUUID(), booking.id, `Payment Receipt — ${providerRef}`],
    );
    await tx.query(
      `INSERT INTO vijaya."AuditLog" ("id", "action", "entity", "entityRef", "createdAt")
       VALUES ($1,'PAYMENT_SUCCESS','Payment',$2,now())`,
      [randomUUID(), providerRef],
    );
    return Response.json({ ok: true, providerRef });
  });
}
