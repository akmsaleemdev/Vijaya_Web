import { z } from "zod";
import { checkAvailability } from "@/lib/availability";
import { dates, indiaDate, slotKeys } from "@/lib/booking/slots";

const input = z.object({ date: dates, slot: slotKeys, guests: z.coerce.number().int().min(1).max(10000), eventType: z.string().max(40).optional() });
export async function POST(req: Request) {
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.date < indiaDate()) return Response.json({ error: "Choose a valid date, session and guest count." }, { status: 422 });
  const { date, slot, guests } = parsed.data;
  const result = await checkAvailability(parsed.data);
  return Response.json({ date, slot, guests, ...result }, { headers: { "Cache-Control": "no-store" } });
}
