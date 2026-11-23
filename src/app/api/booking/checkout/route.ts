import { z } from "zod";
import { randomUUID } from "node:crypto";
import { bookingTransaction } from "@/lib/booking/transaction";
import { bookingMode } from "@/lib/payments/settings";
import { cancelIn, heldStatuses } from "@/lib/booking/state";
import type { Booking, Space } from "@/lib/db/types";

const input = z.object({
  reference: z.string().max(80).toUpperCase(),
  name: z.string().trim().min(1).max(120),
  email: z.email().trim().toLowerCase().max(160),
  phone: z.string().trim().min(1).max(32),
  country: z.string().trim().max(60).default("India"),
  notes: z.string().max(2000).optional(),
  acceptTerms: z.literal(true),
});
export async function POST(req: Request) {
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter your contact details and accept the booking terms." }, { status: 422 });
  const { reference, name, phone, email, country, notes } = parsed.data;
  const updated = await bookingTransaction(async (tx) => {
    const { rows: [booking] } = await tx.query<Booking>(
      `SELECT * FROM vijaya."Booking" WHERE "reference" = $1`,
      [reference],
    );
    if (!booking || booking.source !== "WEB") return null;
    if (["PENDING_APPROVAL", "PENDING_PAYMENT", "CONFIRMED"].includes(booking.status) && booking.customerEmail === email) {
      return { reference, status: booking.status, totalPayable: Number(booking.totalPayable) };
    }
    if (booking.status !== "PENDING_HOLD" || !booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) return null;
    const { rows: [space] } = await tx.query<Pick<Space, "requiresApproval">>(
      `SELECT "requiresApproval" FROM vijaya."Space" WHERE "id" = $1`,
      [booking.spaceId],
    );
    const sandbox = !space?.requiresApproval && await bookingMode(tx) === "SANDBOX";
    const status = sandbox ? "PENDING_PAYMENT" : "PENDING_APPROVAL";
    const holdExpiresAt = sandbox ? booking.holdExpiresAt : null;
    const locks = await tx.query(
      `UPDATE vijaya."SlotState"
       SET "status" = $2::vijaya."SlotStatus", "holdExpiresAt" = $3, "updatedAt" = now()
       WHERE "bookingRef" = $1 AND "status" = 'TEMPORARY_HOLD' AND "source" = 'ONLINE'`,
      [reference, status, holdExpiresAt],
    );
    if (!locks.rowCount) return null;
    await tx.query(
      `INSERT INTO vijaya."AuditLog" ("id", "action", "entity", "entityRef", "createdAt")
       VALUES ($1,$2,'Booking',$3,now())`,
      [randomUUID(), sandbox ? "CHECKOUT_STARTED" : "BOOKING_REQUEST_SUBMITTED", reference],
    );
    const { rows: [updated] } = await tx.query<Pick<Booking, "reference" | "status" | "totalPayable">>(
      `UPDATE vijaya."Booking"
       SET "status" = $2::vijaya."BookingStatus", "holdExpiresAt" = $3,
           "customerName" = $4, "customerPhone" = $5, "customerEmail" = $6,
           "customerCountry" = $7, "notes" = $8, "updatedAt" = now()
       WHERE "reference" = $1
       RETURNING "reference", "status"::text AS "status", "totalPayable"`,
      [reference, status, holdExpiresAt, name, phone, email, country, notes ?? null],
    );
    return updated ?? null;
  });
  return updated ? Response.json({ ...updated, totalPayable: Number(updated.totalPayable) }) : Response.json({ code: "HOLD_EXPIRED", error: "Your temporary hold is no longer available." }, { status: 409 });
}

export async function DELETE(req: Request) {
  const reference = new URL(req.url).searchParams.get("reference")?.toUpperCase();
  if (!reference || reference.length > 80) return Response.json({ error: "Booking reference required." }, { status: 422 });
  await bookingTransaction(async (tx) => {
    const { rows: [booking] } = await tx.query<Booking>(
      `SELECT * FROM vijaya."Booking" WHERE "reference" = $1`,
      [reference],
    );
    if (booking?.source === "WEB" && heldStatuses.includes(booking.status)) {
      await cancelIn(tx, booking, "CANCELLED", "Customer abandoned checkout");
    }
  });
  return Response.json({ ok: true });
}
