import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Booking, BookingStatus, SlotState, SlotStatus } from "@/lib/db/types";
import { COMBO_RULES } from "@/lib/data/spaces";
import { intervals, overlaps, slotKeys, utcRange } from "./slots";
import { bookingTransaction } from "./transaction";

export const heldStatuses: BookingStatus[] = ["PENDING_HOLD", "PENDING_PAYMENT"];
export const pendingStatuses: BookingStatus[] = [...heldStatuses, "PENDING_APPROVAL"];
type Executor = Pick<PoolClient, "query">;

export function physicalSpaces(slug: string) {
  return COMBO_RULES.find((combo) => combo.active && combo.comboSlug === slug)?.childSlugs ?? [slug];
}

export async function slotRange(tx: Executor, spaceId: string, key: string) {
  const { rows } = await tx.query<{ enabled: boolean; startMinute: number; endMinute: number }>(
    `SELECT "enabled", "startMinute", "endMinute" FROM vijaya."SessionConfig" WHERE "spaceId" = $1 AND "key" = $2`,
    [spaceId, key],
  );
  const custom = rows[0];
  if (custom) return custom.enabled ? [custom.startMinute, custom.endMinute] as const : null;
  const slot = slotKeys.safeParse(key);
  return slot.success ? intervals[slot.data] : null;
}

export function matchesRange(row: Pick<SlotState, "startMinute" | "endMinute" | "slot">, range: readonly [number, number]) {
  const key = slotKeys.safeParse(row.slot);
  const fallback = key.success ? intervals[key.data] : intervals.FULL_DAY;
  return overlaps([row.startMinute ?? fallback[0], row.endMinute ?? fallback[1]], range);
}

class SlotConflict extends Error {}

export function isSlotConflict(error: unknown) {
  if (error instanceof SlotConflict) return true;
  if (error instanceof Error && /SlotState_no_overlap|Booking_no_overlap|23P01/.test(error.message)) return true;
  return !!error && typeof error === "object" && "code" in error && error.code === "23P01";
}

export async function expireIn(tx: Executor, now = new Date()) {
  const { rows: stale } = await tx.query<{ reference: string }>(
    `UPDATE vijaya."Booking"
     SET "status" = 'EXPIRED', "holdExpiresAt" = NULL, "updatedAt" = $2
     WHERE "status"::text = ANY($1::text[]) AND "holdExpiresAt" <= $2
     RETURNING "reference"`,
    [heldStatuses, now],
  );
  const references = stale.map(({ reference }) => reference);
  if (references.length) {
    await tx.query(
      `DELETE FROM vijaya."SlotState" WHERE "bookingRef" = ANY($1::text[]) AND "source" = ANY($2::text[])`,
      [references, ["ONLINE", "OPS"]],
    );
    await tx.query(
      `INSERT INTO vijaya."AuditLog" ("id", "action", "entity", "entityRef", "createdAt")
       SELECT gen_random_uuid()::text, 'HOLD_EXPIRED', 'Booking', reference, $2
       FROM unnest($1::text[]) AS reference`,
      [references, now],
    );
  }
  return references.length;
}

export const expireHolds = () => bookingTransaction((tx) => expireIn(tx));

export async function reserve(tx: Executor, data: {
  spaceSlug: string; date: string; slot: string; range: readonly [number, number];
  status: SlotStatus; source: string; bookingRef?: string; holdExpiresAt?: Date; note?: string; groupId?: string;
}) {
  const spaceIds = physicalSpaces(data.spaceSlug);
  // Check the interval inside the write transaction so callers get a stable
  // application error. PostgreSQL still enforces exclusion at write time.
  const { rows: occupants } = await tx.query<Pick<SlotState, "slot" | "startMinute" | "endMinute">>(
    `SELECT "slot", "startMinute", "endMinute" FROM vijaya."SlotState"
     WHERE "spaceId" = ANY($1::text[]) AND "date" = $2 AND "status" <> 'CANCELLED'`,
    [spaceIds, data.date],
  );
  if (occupants.some((row) => row.slot === data.slot || matchesRange(row, data.range))) {
    throw new SlotConflict("SLOT_UNAVAILABLE");
  }
  // Legacy cancelled rows do not occupy a slot but still own their unique key.
  await tx.query(
    `DELETE FROM vijaya."SlotState"
     WHERE "spaceId" = ANY($1::text[]) AND "date" = $2 AND "slot" = $3 AND "status" = 'CANCELLED'`,
    [spaceIds, data.date, data.slot],
  );
  try {
    for (const spaceId of spaceIds) {
      await tx.query(
        `INSERT INTO vijaya."SlotState"
          ("id", "spaceId", "date", "slot", "startMinute", "endMinute", "status", "source", "bookingRef", "holdExpiresAt", "note", "groupId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7::vijaya."SlotStatus", $8, $9, $10, $11, $12, now(), now())`,
        [
          randomUUID(), spaceId, data.date, data.slot, data.range[0], data.range[1],
          data.status, data.source, data.bookingRef ?? null, data.holdExpiresAt ?? null,
          data.note ?? null, data.groupId ?? null,
        ],
      );
    }
  } catch (error) {
    const duplicate = typeof error === "object" && error !== null && "code" in error && error.code === "23505";
    if (duplicate || (error instanceof Error && /SlotState_no_overlap|23P01/.test(error.message))) {
      throw new SlotConflict("SLOT_UNAVAILABLE", { cause: error });
    }
    throw error;
  }
  return { childSpaceIds: JSON.stringify(spaceIds), ...utcRange(data.date, ...data.range) };
}

export async function cancelIn(tx: Executor, booking: Booking, status: "CANCELLED" | "REJECTED", reason: string, actorId?: string, ip?: string) {
  const { rows: [updated] } = await tx.query<Booking>(
    `UPDATE vijaya."Booking" SET "status" = $2::vijaya."BookingStatus", "cancelledAt" = now(), "holdExpiresAt" = NULL, "updatedAt" = now()
     WHERE "id" = $1 RETURNING *`,
    [booking.id, status],
  );
  await tx.query(
    `DELETE FROM vijaya."SlotState" WHERE "bookingRef" = $1 AND "source" = ANY($2::text[])`,
    [booking.reference, ["ONLINE", "OPS"]],
  );
  await tx.query(
    `INSERT INTO vijaya."AuditLog" ("id", "action", "entity", "entityRef", "actorId", "ip", "beforeJson", "afterJson", "createdAt")
     VALUES ($1, $2, 'Booking', $3, $4, $5, $6, $7, now())`,
    [
      randomUUID(), status, booking.reference, actorId ?? null, ip ?? null,
      JSON.stringify({ status: booking.status }), JSON.stringify({ status, reason }),
    ],
  );
  return updated;
}
