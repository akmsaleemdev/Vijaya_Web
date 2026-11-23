import { NextResponse } from "next/server";
import { createTemporaryHold } from "@/lib/availability";
import { holdInput, slotKeys } from "@/lib/booking/slots";
import { sessionAvailability } from "@/lib/booking/calendar";
import { inr } from "@/lib/pricing";

export async function POST(req: Request) {
  const parsed = holdInput.safeParse(await req.json().catch(() => null));
  const key = req.headers.get("Idempotency-Key") ?? undefined;
  if (!parsed.success || (key && key.length > 128)) return NextResponse.json({ error: "Invalid booking details." }, { status: 422 });
  const result = await createTemporaryHold(parsed.data, { key });
  if (!result.ok) {
    const status = result.code === "NOT_BOOKABLE" ? 403 : result.code === "INVALID" ? 422 : 409;
    const alternatives = result.code === "SLOT_UNAVAILABLE"
      ? (await sessionAvailability(parsed.data.spaceSlug, parsed.data.date, parsed.data.date))
          .filter((row) => row.status === "AVAILABLE" && slotKeys.safeParse(row.session).success)
          .map((row) => row.session)
      : undefined;
    return NextResponse.json({ ...result, alternatives }, { status });
  }
  return NextResponse.json({
    ...result, quote: {
      ...result.amounts, totalContractLabel: inr(result.amounts.totalContract), depositLabel: inr(result.amounts.deposit),
    },
  });
}
