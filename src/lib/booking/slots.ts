import { z } from "zod";

export const dates = z.iso.date();
export const slotKeys = z.enum(["MORNING", "AFTERNOON", "EVENING", "FULL_DAY"]);
export const intervals = {
  MORNING: [420, 780],
  AFTERNOON: [780, 1080],
  EVENING: [1080, 1380],
  FULL_DAY: [0, 1440],
} as const;

export function indiaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function utcRange(date: string, start: number, end: number) {
  const midnight = Date.parse(date + "T00:00:00+05:30");
  return { startAt: new Date(midnight + start * 60_000), endAt: new Date(midnight + end * 60_000) };
}

export function overlaps(a: readonly [number, number], b: readonly [number, number]) {
  return a[0] < b[1] && b[0] < a[1];
}

export const holdInput = z.object({
  spaceSlug: z.string().min(1).max(100),
  date: dates,
  slot: slotKeys,
  guests: z.coerce.number().int().positive().max(100000),
  eventType: z.enum(["WEDDING", "BUSINESS", "CELEBRATION"]),
  addOns: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  customer: z.object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.email().trim().toLowerCase().max(160).optional(),
    phone: z.string().trim().min(1).max(32).optional(),
    country: z.string().trim().max(60).optional(),
    notes: z.string().trim().max(2000).optional(),
  }).optional(),
});
