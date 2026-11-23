import { NextResponse } from "next/server";
import { createTemporaryHold } from "@/lib/availability";
import { quoteFor, inr } from "@/lib/pricing";
import { SLOTS, type SlotId } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * POST /api/booking/hold
 * Creates an atomic temporary hold + HOLD booking.
 * Body: { spaceSlug, date, slot, guests, eventType, customer:{name,email,phone,country,notes} }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { spaceSlug, date, slot, guests, eventType, customer } = body || {};

    if (!spaceSlug || !date || !slot || !guests || !eventType) {
      return NextResponse.json({ error: "Missing booking parameters." }, { status: 400 });
    }
    if (customer?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(customer.email))) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    if (!SLOTS.some((s) => s.id === slot)) {
      return NextResponse.json({ error: "Unknown slot." }, { status: 400 });
    }

    const result = await createTemporaryHold({
      spaceSlug,
      date,
      slot: slot as SlotId,
      guests: Number(guests),
      eventType: String(eventType),
      customer: customer
        ? {
            name: customer.name ? String(customer.name).slice(0, 120) : undefined,
            email: customer.email ? String(customer.email).toLowerCase().slice(0, 160) : undefined,
            phone: customer.phone ? String(customer.phone).slice(0, 32) : undefined,
            country: customer.country ? String(customer.country).slice(0, 60) : undefined,
            notes: customer.notes ? String(customer.notes).slice(0, 2000) : undefined,
          }
        : undefined,
    });

    if (!result.ok) {
      const status = result.code === "UNAVAILABLE" ? 409 : result.code === "NOT_BOOKABLE" ? 403 : 400;
      return NextResponse.json({ code: result.code, message: result.message, detail: result.detail }, { status });
    }

    const quote = quoteFor(spaceSlug, date, slot);
    return NextResponse.json({
      reference: result.reference,
      holdExpiresAt: result.holdExpiresAt,
      spaceName: result.spaceName,
      amounts: result.amounts,
      quote: {
        ...quote,
        totalContractLabel: inr(quote.totalContract),
        depositLabel: inr(quote.deposit),
      },
    });
  } catch (e) {
    console.error("booking/hold error", e);
    return NextResponse.json({ error: "We couldn't create your hold. Please try again." }, { status: 500 });
  }
}
