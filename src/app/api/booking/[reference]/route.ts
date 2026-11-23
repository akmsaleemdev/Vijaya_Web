import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/booking/[reference] — checkout + portal status fetch.
 * Returns non-sensitive booking state (no full contact details).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const ref = reference.toUpperCase();
  const b = await db.booking.findUnique({
    where: { reference: ref },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!b) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  return NextResponse.json({
    reference: b.reference,
    spaceName: b.spaceName,
    eventType: b.eventType,
    eventDate: b.eventDate,
    slot: b.slot,
    guests: b.guests,
    status: b.status,
    crmSync: b.crmSync,
    holdExpiresAt: b.holdExpiresAt,
    amounts: {
      base: b.baseAmount,
      weekendUplift: b.weekendUplift,
      tax: b.taxAmount,
      deposit: b.depositAmount,
      totalPayable: b.totalPayable,
      totalContract: b.baseAmount + b.weekendUplift + b.taxAmount,
    },
    payments: b.payments.map((p) => ({
      providerRef: p.providerRef,
      amount: p.amount,
      status: p.status,
      method: p.method,
      transactionId: p.transactionId,
      createdAt: p.createdAt,
    })),
    customerFirstName: b.customerName && b.customerName.startsWith("—") ? null : b.customerName.split(" ")[0],
  });
}
