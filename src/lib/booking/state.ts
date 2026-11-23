import type { Booking, Prisma, SlotState } from "@prisma/client";
import { COMBO_RULES } from "@/lib/data/spaces";
import { intervals, overlaps, slotKeys, utcRange } from "./slots";
import { bookingTransaction } from "./transaction";

export const heldStatuses = ["HOLD", "PENDING_PAYMENT"];
export function physicalSpaces(slug: string) {
  return COMBO_RULES.find((combo) => combo.active && combo.comboSlug === slug)?.childSlugs ?? [slug];
}

export async function slotRange(tx: Prisma.TransactionClient, spaceId: string, key: string) {
  const custom = await tx.sessionConfig.findUnique({ where: { spaceId_key: { spaceId, key } } });
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
  return error instanceof SlotConflict;
}

export async function expireIn(tx: Prisma.TransactionClient, now = new Date()) {
  const stale = await tx.booking.findMany({
    where: { status: { in: heldStatuses }, holdExpiresAt: { lte: now } },
    select: { reference: true },
  });
  const references = stale.map(({ reference }) => reference);
  if (references.length) {
    await tx.booking.updateMany({ where: { reference: { in: references } }, data: { status: "EXPIRED", holdExpiresAt: null } });
    await tx.slotState.deleteMany({ where: { bookingRef: { in: references }, source: { in: ["ONLINE", "OPS"] } } });
    await tx.auditLog.createMany({ data: references.map((entityRef) => ({ action: "HOLD_EXPIRED", entity: "Booking", entityRef })) });
  }
  return references.length;
}

export const expireHolds = () => bookingTransaction((tx) => expireIn(tx));

export async function reserve(tx: Prisma.TransactionClient, data: {
  spaceSlug: string; date: string; slot: string; range: readonly [number, number];
  status: string; source: string; bookingRef?: string; holdExpiresAt?: Date; note?: string; groupId?: string;
}) {
  const spaceIds = physicalSpaces(data.spaceSlug);
  // Prisma can report the SQLite trigger rejection as a foreign-key error.
  // Check the same range inside the write transaction to return a stable conflict.
  const occupants = await tx.slotState.findMany({ where: {
    spaceId: { in: spaceIds }, date: data.date, status: { not: "CANCELLED" },
  } });
  if (occupants.some((row) => row.slot === data.slot || matchesRange(row, data.range))) {
    throw new SlotConflict("SLOT_UNAVAILABLE");
  }
  // Legacy cancelled rows do not occupy a slot but still own their unique key.
  await tx.slotState.deleteMany({ where: { spaceId: { in: spaceIds }, date: data.date, slot: data.slot, status: "CANCELLED" } });
  try {
    await tx.slotState.createMany({ data: spaceIds.map((spaceId) => ({
      spaceId, date: data.date, slot: data.slot,
      startMinute: data.range[0], endMinute: data.range[1],
      status: data.status, source: data.source, bookingRef: data.bookingRef,
      holdExpiresAt: data.holdExpiresAt, note: data.note, groupId: data.groupId,
    })) });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new SlotConflict("SLOT_UNAVAILABLE", { cause: error });
    }
    throw error;
  }
  return { childSpaceIds: JSON.stringify(spaceIds), ...utcRange(data.date, ...data.range) };
}

export async function cancelIn(tx: Prisma.TransactionClient, booking: Booking, status: "CANCELLED" | "REJECTED", reason: string, actorId?: string, ip?: string) {
  const updated = await tx.booking.update({ where: { id: booking.id }, data: {
    status, cancelledAt: new Date(), holdExpiresAt: null,
  } });
  await tx.slotState.deleteMany({ where: { bookingRef: booking.reference, source: { in: ["ONLINE", "OPS"] } } });
  await tx.auditLog.create({ data: {
    action: status, entity: "Booking", entityRef: booking.reference, actorId, ip,
    beforeJson: JSON.stringify({ status: booking.status }), afterJson: JSON.stringify({ status, reason }),
  } });
  return updated;
}
