/**
 * VIJAYA availability engine — server-side only.
 *
 * CORE RULES (non-negotiable):
 * - Availability validation ALWAYS happens here, server-side. Never in the browser.
 * - A date/slot booked offline or online can never become available to another customer.
 * - Temporary holds are created atomically (SQLite write serialization + unique
 *   constraint on spaceId/date/slot gives race-free double-booking protection).
 * - Availability is revalidated immediately before payment.
 * - All online + offline (CRM) bookings converge on the same SlotState table.
 *
 * CRM: Until the CRM API is connected, this engine is the booking middleware.
 * /api/crm/sync writes OFFLINE_CRM rows into the same table, and a sync job
 * pushes confirmed online bookings out via crmSyncBooking().
 */

import { createHash, randomBytes } from "node:crypto";
import { bookingTransaction } from "@/lib/booking/transaction";
import { expireHolds, expireIn, heldStatuses, isSlotConflict, matchesRange, physicalSpaces, reserve, slotRange } from "@/lib/booking/state";
import { priceConfig } from "@/lib/booking/price-config";
import { indiaDate, intervals } from "@/lib/booking/slots";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { COMBO_RULES, SPACE_BY_SLUG } from "@/lib/data/spaces";
import { BOOKING_CONFIG, type SlotId } from "@/lib/site-config";
import { siteContent } from "@/lib/content";
import { inr, quoteFor } from "@/lib/pricing";

export interface SpaceAvailability {
  slug: string;
  name: string;
  category: string;
  setting: string;
  isCombo: boolean;
  childSlugs: string[];
  available: boolean;
  status: string | null;
  guestRange: [number, number] | null;
  requiresApproval: boolean;
  note: string | null;
  indicative: string;
}

export const sweepExpiredHolds = expireHolds;
export const involvedSpaces = physicalSpaces;

function comboFor(slug: string) {
  return COMBO_RULES.find((combo) => combo.active && combo.comboSlug === slug);
}

async function statusesFor(slugs: string[], date: string, slot: SlotId, venue: string) {
  const range = await slotRange(db, venue, slot);
  if (!range) return null;
  const rows = await db.slotState.findMany({
    where: { spaceId: { in: slugs }, date, status: { not: "CANCELLED" } },
  });
  return rows.filter((row) => matchesRange(row, range));
}

/**
 * Check availability for every compatible bookable space.
 * Compatibility = guest range overlap (provisional) and event relevance.
 */
export async function checkAvailability(opts: {
  date: string;
  slot: SlotId;
  guests: number;
  eventType?: string;
}): Promise<{ spaces: SpaceAvailability[]; crmNotice: string | null }> {
  await sweepExpiredHolds();

  const active = await db.space.findMany({ where: { active: true, availabilityEnabled: true, bookableOnline: true } });
  const spaces = active.flatMap((venue) => {
    const existing = SPACE_BY_SLUG[venue.id];
    const bounds: [number, number] | null = venue.capacityMin !== null && venue.capacityMax !== null ? [venue.capacityMin, venue.capacityMax] : null;
    return [{ slug: venue.id, officialName: venue.name, venueCategory: venue.category, indoorOrOutdoor: venue.setting, guestRange: bounds ?? existing?.guestRange, requiresManualApproval: venue.requiresApproval, pricingJson: venue.pricingJson }];
  });
  const result: SpaceAvailability[] = [];

  for (const s of spaces) {
    if (s.guestRange && (opts.guests < s.guestRange[0] || opts.guests > s.guestRange[1])) {
      continue; // not compatible with guest count — hidden, not "unavailable"
    }
    const involved = involvedSpaces(s.slug);
    const rows = await statusesFor(involved, opts.date, opts.slot, s.slug);
    const quote = quoteFor(s.slug, opts.date, opts.slot, s.pricingJson);
    const blocking = rows?.find((r) => r.status !== "CANCELLED");
    result.push({
      slug: s.slug,
      name: s.officialName,
      category: s.venueCategory,
      setting: s.indoorOrOutdoor,
      isCombo: !!comboFor(s.slug),
      childSlugs: involved,
      available: rows !== null && !blocking,
      status: blocking ? blocking.status : null,
      guestRange: s.guestRange ?? null,
      requiresApproval: s.requiresManualApproval,
      note: null,
      indicative: quote.base > 0 ? `${inr(quote.deposit)} token · ${inr(quote.totalContract)} total` : "Priced on request",
    });
  }

  return {
    spaces: result,
    crmNotice: BOOKING_CONFIG.crmConnected
      ? null
      : "Live availability is synchronised with the VIJAYA booking office. Until the CRM integration is switched on, offline bookings are mirrored through the sync endpoint.",
  };
}

/** Calendar payload for a month: per-date summary of how many spaces are free. */
export async function getMonthAvailability(
  month: string, // YYYY-MM
  guests?: number,
  venueId?: string,
): Promise<Record<string, { free: number; total: number; sessions: Record<SlotId, number> }>> {
  await sweepExpiredHolds();
  const spaces = (await db.space.findMany({ where: { active: true, availabilityEnabled: true, bookableOnline: true, id: venueId } }))
    .filter((s) => !guests || (guests >= (s.capacityMin ?? 0) && guests <= (s.capacityMax ?? Infinity)));
  const configs = await db.sessionConfig.findMany();
  const allSlots = ["MORNING", "AFTERNOON", "EVENING", "FULL_DAY"] as const;
  const from = `${month}-01`;
  const to = `${month}-31`;
  const rows = await db.slotState.findMany({
    where: { date: { gte: from, lte: to }, status: { not: "CANCELLED" } },
  });
  const byDate: Record<string, { free: number; total: number; sessions: Record<SlotId, number> }> = {};
  const days = daysInMonth(month);
  for (const d of days) {
    byDate[d] = { free: 0, total: spaces.length, sessions: { MORNING: 0, AFTERNOON: 0, EVENING: 0, FULL_DAY: 0 } };
  }
  for (const s of spaces) {
    const involved = involvedSpaces(s.id);
    const sessions = allSlots.map((key) => {
      const config = configs.find((item) => item.spaceId === s.id && item.key === key);
      const range = config ? config.enabled ? [config.startMinute, config.endMinute] as const : null : intervals[key];
      return { key, range };
    });
    for (const d of days) {
      const occupied = rows.filter((r) => involved.includes(r.spaceId) && r.date === d);
      const free = sessions.filter(({ range }) => range && !occupied.some((row) => matchesRange(row, range)));
      if (free.length) byDate[d].free += 1;
      for (const session of free) byDate[d].sessions[session.key] += 1;
    }
  }
  return byDate;
}

function daysInMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

export interface HoldInput {
  spaceSlug: string;
  date: string;
  slot: string;
  guests: number;
  eventType: string;
  addOns?: string[];
  customer?: { name?: string; phone?: string; email?: string; country?: string; notes?: string };
}

export type HoldResult =
  | { ok: true; reference: string; holdExpiresAt: string | null; spaceName: string; amounts: ReturnType<typeof quoteFor> }
  | { ok: false; code: "SLOT_UNAVAILABLE" | "NOT_BOOKABLE" | "INVALID" | "IDEMPOTENCY_CONFLICT"; message: string };

export async function createTemporaryHold(
  input: HoldInput,
  options: { key?: string; actorId?: string; ip?: string; confirm?: boolean } = {},
): Promise<HoldResult> {
  const requestKey = options.key ? (options.actorId ? `admin:${options.actorId}:` : "web:") + options.key : undefined;
  const requestHash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const mins = (await siteContent("site.settings", "en"))?.holdMinutes ?? Number(process.env.BOOKING_HOLD_MINUTES ?? 15);
  const reference = generateReference();
  try {
    return await bookingTransaction(async (tx) => {
      await expireIn(tx);
      const booked = requestKey && await tx.booking.findUnique({ where: { requestKey } });
      if (booked) {
        if (booked.requestHash !== requestHash) return { ok: false, code: "IDEMPOTENCY_CONFLICT", message: "Use a new request key for a different booking." };
        const amounts = { base: booked.baseAmount, weekendUplift: booked.weekendUplift, tax: booked.taxAmount, deposit: booked.depositAmount, totalPayable: booked.totalPayable, totalContract: booked.baseAmount + booked.weekendUplift + booked.taxAmount, balanceDue: booked.baseAmount + booked.weekendUplift + booked.taxAmount - booked.totalPayable };
        return { ok: true, reference: booked.reference, holdExpiresAt: booked.holdExpiresAt?.toISOString() ?? null, spaceName: booked.spaceName, amounts };
      }
      const space = await tx.space.findUnique({ where: { id: input.spaceSlug } });
      if (!space?.active || (!options.actorId && (!space.bookableOnline || !space.availabilityEnabled))) {
        return { ok: false, code: "NOT_BOOKABLE", message: "This space cannot be booked. Please contact our events team." };
      }
      if ((space.capacityMin !== null && input.guests < space.capacityMin) || (space.capacityMax !== null && input.guests > space.capacityMax)) {
        return { ok: false, code: "INVALID", message: "Guest count is outside the permitted range for this space." };
      }
      const range = await slotRange(tx, space.id, input.slot);
      if (!range || input.date < indiaDate()) return { ok: false, code: "INVALID", message: "Choose an active session and a current or future event date." };
      const addOnNames = [...new Set(input.addOns ?? [])];
      const priceRules = space.pricingJson ? priceConfig.parse(JSON.parse(space.pricingJson)) : null;
      const addOns = (priceRules?.addOns ?? []).filter((item) => addOnNames.includes(item.name));
      if (addOns.length !== addOnNames.length) return { ok: false, code: "INVALID", message: "One or more add-ons are unavailable for this venue." };
      const extras = addOns.reduce((total, item) => total + item.price, 0);
      const expires = options.confirm ? undefined : new Date(Date.now() + (Number.isInteger(mins) && mins > 0 && mins <= 1440 ? mins : 15) * 60_000);
      const bookingRange = await reserve(tx, {
        spaceSlug: space.id, date: input.date, slot: input.slot, range, bookingRef: reference,
        status: options.confirm ? "CONFIRMED" : "TEMPORARY_HOLD",
        source: options.actorId ? "OPS" : "ONLINE", holdExpiresAt: expires,
      });
      const amounts = quoteFor(space.id, input.date, input.slot, space.pricingJson, extras);
      const booking = await tx.booking.create({ data: {
        ...bookingRange, reference, requestKey, requestHash, spaceId: space.id, spaceName: space.name,
        eventType: input.eventType, eventDate: input.date, slot: input.slot, guests: input.guests,
        status: options.confirm ? "CONFIRMED" : "HOLD", source: options.actorId ? "ADMIN" : "WEB", createdById: options.actorId,
        confirmedAt: options.confirm ? new Date() : null, crmSync: options.confirm ? "QUEUED" : "NOT_CONNECTED",
        customerName: input.customer?.name ?? "— (hold placed, details pending)",
        customerPhone: input.customer?.phone ?? "", customerEmail: input.customer?.email ?? "",
        customerCountry: input.customer?.country ?? "India", notes: input.customer?.notes, addons: addOns.length ? JSON.stringify(addOns) : undefined,
        baseAmount: amounts.base, weekendUplift: amounts.weekendUplift, taxAmount: amounts.tax,
        depositAmount: amounts.deposit, totalPayable: amounts.totalPayable, holdExpiresAt: expires,
      } });
      if (options.confirm) await createPortalDocuments(tx, booking.id, reference, booking.eventDate, false);
      await tx.auditLog.create({ data: { action: options.confirm ? "BOOKING_CREATED" : "HOLD_CREATED", entity: "Booking", entityRef: reference, actorId: options.actorId, ip: options.ip, afterJson: JSON.stringify({ space: space.id, date: input.date, slot: input.slot }) } });
      return { ok: true, reference, holdExpiresAt: expires?.toISOString() ?? null, spaceName: space.name, amounts };
    });
  } catch (error) {
    if (!isSlotConflict(error)) throw error;
    return { ok: false, code: "SLOT_UNAVAILABLE", message: "That session is unavailable. Choose another time or space." };
  }
}

export async function createPortalDocuments(tx: Prisma.TransactionClient, bookingId: string, reference: string, date: string, paid: boolean) {
  if (await tx.document.count({ where: { bookingId } })) return;
  const kinds = [
    ["CONFIRMATION", "Booking Confirmation"],
    ["INVOICE", "Invoice — " + reference],
    ["AGREEMENT", "Venue Booking Agreement"],
    ...(paid ? [["RECEIPT", "Payment Receipt"]] : []),
  ];
  await tx.document.createMany({ data: kinds.map(([type, title]) => ({ bookingId, type, title })) });
  const milestones = [
    { order: 60, title: "Planning consultation", detail: "Meet your event manager and shape the run of show." },
    { order: 30, title: "Vendor coordination", detail: "Share your vendor list and timelines with the VIJAYA team." },
    { order: 15, title: "Layout & finalisation", detail: "Confirm seating layouts, stage plan and AV requirements." },
    { order: 7, title: "Final walkthrough", detail: "Walk the space with your event manager and sign off the plan." },
    { order: 0, title: "Your event day", detail: "Welcome to VIJAYA. We will take it from here." },
  ];
  await tx.milestone.createMany({ data: milestones.map((milestone) => ({
    ...milestone, bookingId, dueDate: new Date(Date.parse(date + "T00:00:00Z") - milestone.order * 86400000).toISOString().slice(0, 10),
  })) });
}

export async function confirmIn(tx: Prisma.TransactionClient, reference: string, options: { actorId?: string; ip?: string; paymentRef?: string } = {}) {
  const booking = await tx.booking.findUnique({ where: { reference } });
  if (!booking) return false;
  if (booking.status === "CONFIRMED") return true;
  if (!heldStatuses.includes(booking.status) || !booking.holdExpiresAt || booking.holdExpiresAt <= new Date()) return false;
  const locks = await tx.slotState.count({ where: { bookingRef: reference, source: { in: ["ONLINE", "OPS"] } } });
  if (locks !== physicalSpaces(booking.spaceId).length) return false;
  await tx.booking.update({ where: { id: booking.id }, data: { status: "CONFIRMED", confirmedAt: new Date(), holdExpiresAt: null, crmSync: "QUEUED" } });
  await tx.slotState.updateMany({ where: { bookingRef: reference, source: { in: ["ONLINE", "OPS"] } }, data: { status: "CONFIRMED", holdExpiresAt: null } });
  await createPortalDocuments(tx, booking.id, reference, booking.eventDate, !!options.paymentRef);
  await tx.auditLog.create({ data: { action: "BOOKING_CONFIRMED", entity: "Booking", entityRef: reference, actorId: options.actorId, ip: options.ip, beforeJson: JSON.stringify({ status: booking.status }), afterJson: JSON.stringify({ status: "CONFIRMED", paymentRef: options.paymentRef }) } });
  return true;
}

export async function confirmBooking(reference: string, paymentRef: string) {
  const ok = await bookingTransaction((tx) => confirmIn(tx, reference, { paymentRef }));
  return { ok, crmSync: ok ? "QUEUED" : "FAILED" };
}

export async function crmApplySync(payload: {
  action: "BOOK" | "BLOCK" | "RELEASE"; spaceId: string; date: string; slot: string; note?: string; bookingRef?: string;
}) {
  try {
    return await bookingTransaction(async (tx) => {
      await expireIn(tx);
      const space = await tx.space.findUnique({ where: { id: payload.spaceId } });
      const range = space && await slotRange(tx, payload.spaceId, payload.slot);
      if (!range) return { ok: false, message: "Unknown venue or session." };
      const groupId = `crm:${payload.spaceId}:${payload.date}:${payload.slot}`;
      const legacy = { source: "OFFLINE_CRM", spaceId: payload.spaceId, date: payload.date, slot: payload.slot, groupId: null };
      if (payload.action === "RELEASE") {
        await tx.slotState.deleteMany({ where: { OR: [{ source: "OFFLINE_CRM", groupId }, legacy] } });
      } else {
        const status = payload.action === "BOOK" ? "CONFIRMED" : "BLOCKED";
        const existing = await tx.slotState.findFirst({ where: { OR: [{ source: "OFFLINE_CRM", groupId }, legacy] } });
        if (existing) return { ok: existing.status === status && existing.bookingRef === (payload.bookingRef ?? null), message: "A CRM reservation already exists for this session." };
        await reserve(tx, { spaceSlug: payload.spaceId, date: payload.date, slot: payload.slot, range, status, source: "OFFLINE_CRM", groupId, note: payload.note, bookingRef: payload.bookingRef });
      }
      await tx.auditLog.create({ data: { action: `CRM_${payload.action}`, entity: "SlotState", entityRef: groupId } });
      return { ok: true, message: "Availability updated." };
    });
  } catch (error) {
    if (!isSlotConflict(error)) throw error;
    return { ok: false, message: "The requested session overlaps an existing reservation." };
  }
}

export function generateReference() {
  return "VIJ-" + randomBytes(10).toString("hex").toUpperCase();
}
