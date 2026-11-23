import { query } from "@/lib/db";
import type { SessionConfig, SlotState, Space } from "@/lib/db/types";
import { expireHolds, matchesRange, physicalSpaces } from "./state";
import { intervals } from "./slots";

export async function sessionAvailability(venueId: string, from: string, to: string) {
  await expireHolds();
  const { rows: [venue] } = await query<Space>(
    `SELECT * FROM vijaya."Space" WHERE "id" = $1`,
    [venueId],
  );
  if (!venue?.active || !venue.availabilityEnabled) return [];
  const { rows: custom } = await query<SessionConfig>(
    `SELECT * FROM vijaya."SessionConfig" WHERE "spaceId" = $1`,
    [venueId],
  );
  const { rows } = await query<Pick<SlotState, "date" | "slot" | "startMinute" | "endMinute" | "status">>(
    `SELECT "date", "slot", "startMinute", "endMinute", "status"::text AS "status"
     FROM vijaya."SlotState"
     WHERE "spaceId" = ANY($1::text[]) AND "date" BETWEEN $2 AND $3 AND "status" <> 'CANCELLED'`,
    [physicalSpaces(venueId), from, to],
  );
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
