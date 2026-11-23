/**
 * VIJAYA availability engine — server-side only.
 *
 * CORE RULES (non-negotiable):
 * - Availability validation ALWAYS happens here, server-side. Never in the browser.
 * - A date/slot booked offline or online can never become available to another customer.
 * - PostgreSQL transactions and a range exclusion constraint prevent
 *   overlapping holds and bookings, even across application instances.
 * - Availability is revalidated immediately before payment.
 * - All online + offline (CRM) bookings converge on the same SlotState table.
 *
 * CRM: Until the CRM API is connected, this engine is the booking middleware.
 * /api/crm/sync writes OFFLINE_CRM rows into the same table, and a sync job
 * pushes confirmed online bookings out via crmSyncBooking().
 */

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { publicAmounts } from "@/lib/booking/amounts";
import { bookingTransaction } from "@/lib/booking/transaction";
import { expireHolds, expireIn, heldStatuses, isSlotConflict, matchesRange, physicalSpaces, reserve, slotRange } from "@/lib/booking/state";
import { priceConfig } from "@/lib/booking/price-config";
import { indiaDate, intervals } from "@/lib/booking/slots";
import { getPool, query } from "@/lib/db";
import type { Booking, SlotState, Space } from "@/lib/db/types";
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
  const range = await slotRange(getPool(), venue, slot);
  if (!range) return null;
  const { rows } = await query<SlotState>(
    `SELECT * FROM vijaya."SlotState"
     WHERE "spaceId" = ANY($1::text[]) AND "date" = $2 AND "status" <> 'CANCELLED'`,
    [slugs, date],
  );
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

  const { rows: active } = await query<Space>(
    `SELECT * FROM vijaya."Space" WHERE "active" AND "availabilityEnabled" AND "bookableOnline"`,
  );
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
  const { rows: availableSpaces } = await query<Space>(
    `SELECT * FROM vijaya."Space"
     WHERE "active" AND "availabilityEnabled" AND "bookableOnline"
       AND ($1::text IS NULL OR "id" = $1)`,
    [venueId ?? null],
  );
  const spaces = availableSpaces
    .filter((s) => !guests || (guests >= (s.capacityMin ?? 0) && guests <= (s.capacityMax ?? Infinity)));
  const { rows: configs } = await query<{ spaceId: string; key: string; enabled: boolean; startMinute: number; endMinute: number }>(
    `SELECT "spaceId", "key", "enabled", "startMinute", "endMinute" FROM vijaya."SessionConfig"`,
  );
  const allSlots = ["MORNING", "AFTERNOON", "EVENING", "FULL_DAY"] as const;
  const from = `${month}-01`;
  const to = `${month}-31`;
  const { rows } = await query<SlotState>(
    `SELECT * FROM vijaya."SlotState" WHERE "date" BETWEEN $1 AND $2 AND "status" <> 'CANCELLED'`,
    [from, to],
  );
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
      const { rows: [booked] } = requestKey
        ? await tx.query<Booking>(`SELECT * FROM vijaya."Booking" WHERE "requestKey" = $1`, [requestKey])
        : { rows: [] as Booking[] };
      if (booked) {
        if (booked.requestHash !== requestHash) return { ok: false, code: "IDEMPOTENCY_CONFLICT", message: "Use a new request key for a different booking." };
        const amounts = publicAmounts(booked);

        return { ok: true, reference: booked.reference, holdExpiresAt: booked.holdExpiresAt?.toISOString() ?? null, spaceName: booked.spaceName, amounts: { ...amounts, balanceDue: amounts.totalContract - amounts.totalPayable } };
      }
      const { rows: [space] } = await tx.query<Space>(
        `SELECT * FROM vijaya."Space" WHERE "id" = $1`,
        [input.spaceSlug],
      );
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
      const bookingData = {
        ...bookingRange,
        reference,
        requestKey: requestKey ?? null,
        requestHash,
        spaceId: space.id,
        spaceName: space.name,
        eventType: input.eventType,
        eventDate: input.date,
        slot: input.slot,
        guests: input.guests,
        status: options.confirm ? "CONFIRMED" : "PENDING_HOLD",
        source: options.actorId ? "ADMIN" : "WEB",
        createdById: options.actorId ?? null,
        confirmedAt: options.confirm ? new Date() : null,
        crmSync: options.confirm ? "QUEUED" : "NOT_CONNECTED",
        customerName: input.customer?.name ?? "— (hold placed, details pending)",
        customerPhone: input.customer?.phone ?? "",
        customerEmail: input.customer?.email ?? "",
        customerCountry: input.customer?.country ?? "India",
        notes: input.customer?.notes ?? null,
        addons: addOns.length ? JSON.stringify(addOns) : null,
        baseAmount: amounts.base,
        weekendUplift: amounts.weekendUplift,
        taxAmount: amounts.tax,
        depositAmount: amounts.deposit,
        totalPayable: amounts.totalPayable,
        holdExpiresAt: expires ?? null,
      };
      const { rows: [booking] } = await tx.query<Booking>(
        `INSERT INTO vijaya."Booking"
          ("id", "reference", "spaceId", "spaceName", "childSpaceIds", "eventType", "eventDate", "slot", "guests",
           "status", "crmSync", "customerName", "customerPhone", "customerEmail", "source", "createdById",
           "requestKey", "requestHash", "startAt", "endAt", "customerCountry", "notes", "baseAmount", "weekendUplift",
           "taxAmount", "depositAmount", "totalPayable", "addons", "holdExpiresAt", "confirmedAt", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vijaya."BookingStatus",$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28::jsonb,$29,$30,now(),now())
         RETURNING *`,
        [
          randomUUID(), bookingData.reference, bookingData.spaceId, bookingData.spaceName,
          bookingData.childSpaceIds, bookingData.eventType, bookingData.eventDate, bookingData.slot,
          bookingData.guests, bookingData.status, bookingData.crmSync, bookingData.customerName,
          bookingData.customerPhone, bookingData.customerEmail, bookingData.source, bookingData.createdById,
          bookingData.requestKey, bookingData.requestHash, bookingData.startAt, bookingData.endAt,
          bookingData.customerCountry, bookingData.notes, bookingData.baseAmount, bookingData.weekendUplift,
          bookingData.taxAmount, bookingData.depositAmount, bookingData.totalPayable, bookingData.addons,
          bookingData.holdExpiresAt, bookingData.confirmedAt,
        ],
      );
      if (!booking) throw new Error("Booking insert returned no row.");
      if (options.confirm) await createPortalDocuments(tx, booking.id, reference, booking.eventDate, false);
      await tx.query(
        `INSERT INTO vijaya."AuditLog" ("id", "action", "entity", "entityRef", "actorId", "ip", "afterJson", "createdAt")
         VALUES ($1, $2, 'Booking', $3, $4, $5, $6, now())`,
        [
          randomUUID(), options.confirm ? "BOOKING_CREATED" : "HOLD_CREATED", reference,
          options.actorId ?? null, options.ip ?? null,
          JSON.stringify({ space: space.id, date: input.date, slot: input.slot }),
        ],
      );
      return { ok: true, reference, holdExpiresAt: expires?.toISOString() ?? null, spaceName: space.name, amounts };
    });
  } catch (error) {
    if (!isSlotConflict(error)) throw error;
    return { ok: false, code: "SLOT_UNAVAILABLE", message: "That session is unavailable. Choose another time or space." };
  }
}

export async function createPortalDocuments(tx: PoolClient, bookingId: string, reference: string, date: string, paid: boolean) {
  const { rows: [{ count }] } = await tx.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM vijaya."Document" WHERE "bookingId" = $1`,
    [bookingId],
  );
  if (count) return;
  const kinds = [
    ["CONFIRMATION", "Booking Confirmation"],
    ["INVOICE", "Invoice — " + reference],
    ["AGREEMENT", "Venue Booking Agreement"],
    ...(paid ? [["RECEIPT", "Payment Receipt"]] : []),
  ];
  for (const [type, title] of kinds) {
    await tx.query(
      `INSERT INTO vijaya."Document" ("id", "bookingId", "type", "title", "createdAt")
       VALUES ($1, $2, $3, $4, now())`,
      [randomUUID(), bookingId, type, title],
    );
  }
  const milestones = [
    { order: 60, title: "Planning consultation", detail: "Meet your event manager and shape the run of show." },
    { order: 30, title: "Vendor coordination", detail: "Share your vendor list and timelines with the VIJAYA team." },
    { order: 15, title: "Layout & finalisation", detail: "Confirm seating layouts, stage plan and AV requirements." },
    { order: 7, title: "Final walkthrough", detail: "Walk the space with your event manager and sign off the plan." },
    { order: 0, title: "Your event day", detail: "Welcome to VIJAYA. We will take it from here." },
  ];
  for (const milestone of milestones) {
    const dueDate = new Date(Date.parse(date + "T00:00:00Z") - milestone.order * 86400000).toISOString().slice(0, 10);
    await tx.query(
      `INSERT INTO vijaya."Milestone" ("id", "bookingId", "title", "detail", "dueDate", "status", "order", "createdAt")
       VALUES ($1, $2, $3, $4, $5, 'UPCOMING', $6, now())`,
      [randomUUID(), bookingId, milestone.title, milestone.detail, dueDate, milestone.order],
    );
  }
}

export async function confirmIn(tx: PoolClient, reference: string, options: { actorId?: string; ip?: string; paymentRef?: string } = {}) {
  const { rows: [booking] } = await tx.query<Booking>(
    `SELECT * FROM vijaya."Booking" WHERE "reference" = $1`,
    [reference],
  );
  if (!booking) return false;
  if (booking.status === "CONFIRMED") return true;
  const awaitingStaff = booking.status === "PENDING_APPROVAL" && !!options.actorId;
  const activeHold = heldStatuses.includes(booking.status) && booking.holdExpiresAt && booking.holdExpiresAt > new Date();
  if (!awaitingStaff && !activeHold) return false;
  const { rows: [{ count: locks }] } = await tx.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM vijaya."SlotState"
     WHERE "bookingRef" = $1 AND "source" = ANY($2::text[])`,
    [reference, ["ONLINE", "OPS"]],
  );
  if (locks !== physicalSpaces(booking.spaceId).length) return false;
  await tx.query(
    `UPDATE vijaya."Booking"
     SET "status" = 'CONFIRMED', "confirmedAt" = now(), "holdExpiresAt" = NULL, "crmSync" = 'QUEUED', "updatedAt" = now()
     WHERE "id" = $1`,
    [booking.id],
  );
  await tx.query(
    `UPDATE vijaya."SlotState"
     SET "status" = 'CONFIRMED', "holdExpiresAt" = NULL, "updatedAt" = now()
     WHERE "bookingRef" = $1 AND "source" = ANY($2::text[])`,
    [reference, ["ONLINE", "OPS"]],
  );
  await createPortalDocuments(tx, booking.id, reference, booking.eventDate, !!options.paymentRef);
  await tx.query(
    `INSERT INTO vijaya."AuditLog"
      ("id", "action", "entity", "entityRef", "actorId", "ip", "beforeJson", "afterJson", "createdAt")
     VALUES ($1, 'BOOKING_CONFIRMED', 'Booking', $2, $3, $4, $5, $6, now())`,
    [
      randomUUID(), reference, options.actorId ?? null, options.ip ?? null,
      JSON.stringify({ status: booking.status }),
      JSON.stringify({ status: "CONFIRMED", paymentRef: options.paymentRef }),
    ],
  );
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
      const { rows: [space] } = await tx.query<Space>(
        `SELECT * FROM vijaya."Space" WHERE "id" = $1`,
        [payload.spaceId],
      );
      const range = space && await slotRange(tx, payload.spaceId, payload.slot);
      if (!range) return { ok: false, message: "Unknown venue or session." };
      const groupId = `crm:${payload.spaceId}:${payload.date}:${payload.slot}`;
      const legacy = { source: "OFFLINE_CRM", spaceId: payload.spaceId, date: payload.date, slot: payload.slot, groupId: null };
      if (payload.action === "RELEASE") {
        await tx.query(
          `DELETE FROM vijaya."SlotState"
           WHERE "source" = 'OFFLINE_CRM'
             AND ("groupId" = $1 OR ("spaceId" = $2 AND "date" = $3 AND "slot" = $4 AND "groupId" IS NULL))`,
          [groupId, legacy.spaceId, legacy.date, legacy.slot],
        );
      } else {
        const status = payload.action === "BOOK" ? "CONFIRMED" : "BLOCKED";
        const { rows: [existing] } = await tx.query<SlotState>(
          `SELECT * FROM vijaya."SlotState"
           WHERE "source" = 'OFFLINE_CRM'
             AND ("groupId" = $1 OR ("spaceId" = $2 AND "date" = $3 AND "slot" = $4 AND "groupId" IS NULL))
           LIMIT 1`,
          [groupId, legacy.spaceId, legacy.date, legacy.slot],
        );
        if (existing) return { ok: existing.status === status && existing.bookingRef === (payload.bookingRef ?? null), message: "A CRM reservation already exists for this session." };
        await reserve(tx, { spaceSlug: payload.spaceId, date: payload.date, slot: payload.slot, range, status, source: "OFFLINE_CRM", groupId, note: payload.note, bookingRef: payload.bookingRef });
      }
      await tx.query(
        `INSERT INTO vijaya."AuditLog" ("id", "action", "entity", "entityRef", "createdAt")
         VALUES ($1, $2, 'SlotState', $3, now())`,
        [randomUUID(), `CRM_${payload.action}`, groupId],
      );
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
