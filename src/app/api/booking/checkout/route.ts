import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markPendingPayment, releaseBookingSlots } from "@/lib/availability";
import { SLOTS } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * POST /api/booking/checkout — step 7 of the flow.
 * Revalidates the hold server-side, stores customer details, moves to PENDING_PAYMENT.
 * Body: { reference, name, phone, email, country, notes?, acceptTerms: true }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference, name, phone, email, country, notes, acceptTerms } = body || {};

    if (!reference) return NextResponse.json({ error: "Booking reference required." }, { status: 400 });
    if (!name || !phone || !email) {
      return NextResponse.json({ error: "Name, phone and email are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }
    if (!acceptTerms) {
      return NextResponse.json({ error: "Please accept the terms, booking and cancellation policies." }, { status: 400 });
    }

    const booking = await db.booking.findUnique({ where: { reference: String(reference).toUpperCase() } });
    if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

    if (booking.status === "EXPIRED" || booking.status === "CANCELLED") {
      return NextResponse.json(
        {
          code: "HOLD_EXPIRED",
          message: "Your temporary hold has expired.",
          detail: "The selected slot has been released. You can restart Check Your Date — availability may have changed in the meantime.",
        },
        { status: 410 }
      );
    }
    if (!SLOTS.some((s) => s.id === booking.slot)) {
      return NextResponse.json({ error: "Unknown slot on booking." }, { status: 400 });
    }

    const ok = await markPendingPayment(booking.reference);
    if (!ok) {
      return NextResponse.json({ error: "This booking is no longer in a holdable state." }, { status: 409 });
    }

    const updated = await db.booking.update({
      where: { reference: booking.reference },
      data: {
        customerName: String(name).slice(0, 120),
        customerPhone: String(phone).slice(0, 32),
        customerEmail: String(email).toLowerCase().slice(0, 160),
        customerCountry: country ? String(country).slice(0, 60) : "India",
        notes: notes ? String(notes).slice(0, 2000) : booking.notes,
      },
    });

    return NextResponse.json({
      reference: updated.reference,
      status: updated.status,
      totalPayable: updated.totalPayable,
    });
  } catch (e) {
    console.error("booking/checkout error", e);
    return NextResponse.json({ error: "Checkout failed. Please try again." }, { status: 500 });
  }
}

/**
 * DELETE /api/booking/checkout?reference=VIJ-XXXX — customer abandons checkout;
 * releases the hold immediately (calm, no penalty).
 */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "reference required" }, { status: 400 });
  const booking = await db.booking.findUnique({ where: { reference: reference.toUpperCase() } });
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (booking.status !== "CONFIRMED") {
    await releaseBookingSlots(booking.reference, "customer_abandoned");
    await db.booking.update({ where: { reference: booking.reference }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
