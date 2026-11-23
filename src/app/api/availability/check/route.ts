import { NextResponse } from "next/server";
import { checkAvailability } from "@/lib/availability";
import { quoteFor, inr } from "@/lib/pricing";
import type { SlotId } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/**
 * POST /api/availability/check
 * Server-side availability validation — the ONLY source the UI trusts.
 * Body: { date: YYYY-MM-DD, slot: SlotId, guests: number, venue?: slug }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const date: string = body?.date;
    const slot: SlotId = body?.slot;
    const guests: number = Number(body?.guests) || 0;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "A valid date (YYYY-MM-DD) is required." }, { status: 400 });
    }
    if (!slot) {
      return NextResponse.json({ error: "A slot is required." }, { status: 400 });
    }
    if (guests < 1 || guests > 10000) {
      return NextResponse.json({ error: "Guest count must be between 1 and 10,000." }, { status: 400 });
    }

    const result = await checkAvailability({ date, slot, guests });

    const spaces = result.spaces.map((s) => {
      const quote = quoteFor(s.slug, date, slot);
      return {
        ...s,
        indicative: quote.base > 0 ? `${inr(quote.deposit)} token · ${inr(quote.totalContract)} total (sample)` : "Priced on request",
      };
    });

    return NextResponse.json({
      date,
      slot,
      guests,
      spaces,
      crmNotice: result.crmNotice,
    });
  } catch (e) {
    console.error("availability/check error", e);
    return NextResponse.json(
      { error: "Availability is temporarily unavailable. Our team can confirm your date by phone." },
      { status: 500 }
    );
  }
}
