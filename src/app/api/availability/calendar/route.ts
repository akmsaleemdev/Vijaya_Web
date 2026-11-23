import { z } from "zod";
import { getMonthAvailability } from "@/lib/availability";

const input = z.object({
  month: z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/),
  guests: z.string().regex(/^\d{0,5}$/).optional(),
  venue: z.string().min(1).max(100).optional(),
});
export async function GET(req: Request) {
  const parsed = input.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return Response.json({ error: "Choose a valid month and guest count." }, { status: 422 });
  const { month, guests, venue } = parsed.data;
  const data = await getMonthAvailability(month, Number(guests) || undefined, venue);
  return Response.json({ month, days: data }, { headers: { "Cache-Control": "no-store" } });
}
