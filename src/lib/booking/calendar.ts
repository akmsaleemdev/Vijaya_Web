import { db } from "@/lib/db";
import { expireHolds, matchesRange, physicalSpaces } from "./state";
import { intervals } from "./slots";

export async function sessionAvailability(venueId: string, from: string, to: string) {
  await expireHolds();
  const venue = await db.space.findUnique({ where: { id: venueId } });
  if (!venue?.active || !venue.availabilityEnabled) return [];
  const custom = await db.sessionConfig.findMany({ where: { spaceId: venueId } });
  const rows = await db.slotState.findMany({
    where: { spaceId: { in: physicalSpaces(venueId) }, date: { gte: from, lte: to }, status: { not: "CANCELLED" } },
    select: { date: true, slot: true, startMinute: true, endMinute: true, status: true },
  });
  const configs = new Map<string, readonly [number, number]>(Object.entries(intervals));
  for (const item of custom) {
    if (item.enabled) configs.set(item.key, [item.startMinute, item.endMinute]);
    else configs.delete(item.key);
  }
  const result: { date: string; session: string; status: "AVAILABLE" | "HELD" | "BOOKED" | "BLOCKED" }[] = [];
  const dates = new Date(from + "T00:00:00Z");
  const until = Date.parse(to + "T00:00:00Z");
  for (; dates.getTime() <= until; dates.setUTCDate(dates.getUTCDate() + 1)) {
    const date = dates.toISOString().slice(0, 10);
    for (const [session, range] of configs) {
      const conflicts = rows.filter((row) => row.date === date && matchesRange(row, range));
      const status = conflicts.some((r) => ["BLOCKED", "MAINTENANCE", "INTERNAL_USE"].includes(r.status)) ? "BLOCKED"
        : conflicts.some((r) => r.status === "CONFIRMED") ? "BOOKED"
        : conflicts.length ? "HELD" : "AVAILABLE";
      result.push({ date, session, status });
    }
  }
  return result;
}
