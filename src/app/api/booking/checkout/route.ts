import { z } from "zod";
import { bookingTransaction } from "@/lib/booking/transaction";
import { bookingMode } from "@/lib/payments/settings";
import { cancelIn, heldStatuses } from "@/lib/booking/state";

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
    const booking = await tx.booking.findUnique({ where: { reference } });
    if (!booking || booking.source !== "WEB") return null;
    if (["PENDING_APPROVAL", "PENDING_PAYMENT", "CONFIRMED"].includes(booking.status) && booking.customerEmail === email) {
      return { reference, status: booking.status, totalPayable: booking.totalPayable };
    }
    if (booking.status !== "HOLD" || !booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) return null;
    const space = await tx.space.findUnique({ where: { id: booking.spaceId }, select: { requiresApproval: true } });
    const sandbox = !space?.requiresApproval && await bookingMode(tx) === "SANDBOX";
    const status = sandbox ? "PENDING_PAYMENT" : "PENDING_APPROVAL";
    const holdExpiresAt = sandbox ? booking.holdExpiresAt : null;
    const locks = await tx.slotState.updateMany({
      where: { bookingRef: reference, status: "TEMPORARY_HOLD", source: "ONLINE" },
      data: { status, holdExpiresAt },
    });
    if (!locks.count) return null;
    await tx.auditLog.create({ data: { action: sandbox ? "CHECKOUT_STARTED" : "BOOKING_REQUEST_SUBMITTED", entity: "Booking", entityRef: reference } });
    return tx.booking.update({
      where: { reference },
      data: { status, holdExpiresAt, customerName: name, customerPhone: phone, customerEmail: email, customerCountry: country, notes },
      select: { reference: true, status: true, totalPayable: true },
    });
  });
  return updated ? Response.json(updated) : Response.json({ code: "HOLD_EXPIRED", error: "Your temporary hold is no longer available." }, { status: 409 });
}

export async function DELETE(req: Request) {
  const reference = new URL(req.url).searchParams.get("reference")?.toUpperCase();
  if (!reference || reference.length > 80) return Response.json({ error: "Booking reference required." }, { status: 422 });
  await bookingTransaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { reference } });
    if (booking?.source === "WEB" && heldStatuses.includes(booking.status)) {
      await cancelIn(tx, booking, "CANCELLED", "Customer abandoned checkout");
    }
  });
  return Response.json({ ok: true });
}
