import { NextResponse } from "next/server";
import { getMonthAvailability } from "@/lib/availability";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability/calendar?month=YYYY-MM&guests=300
 * Month overview for the date picker: how many spaces are free per day.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month");
    const guests = Number(url.searchParams.get("guests")) || undefined;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month=YYYY-MM required" }, { status: 400 });
    }
    const data = await getMonthAvailability(month, guests);
    return NextResponse.json({ month, days: data });
  } catch (e) {
    console.error("availability/calendar error", e);
    return NextResponse.json({ error: "Calendar temporarily unavailable." }, { status: 500 });
  }
}
