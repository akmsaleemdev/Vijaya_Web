import { z } from "zod";
import { sessionAvailability } from "@/lib/booking/calendar";
import { dates } from "@/lib/booking/slots";

const query = z.object({ venueId: z.string().min(1).max(100), from: dates, to: dates });
export async function GET(req: Request) {
  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success || parsed.data.from > parsed.data.to || Date.parse(parsed.data.to) - Date.parse(parsed.data.from) > 93 * 86400000) {
    return Response.json({ ok: false, error: { code: "INVALID_RANGE", message: "Choose a venue and a date range of up to 94 days." } }, { status: 422 });
  }
  return Response.json({ ok: true, data: await sessionAvailability(parsed.data.venueId, parsed.data.from, parsed.data.to) }, { headers: { "Cache-Control": "no-store" } });
}
