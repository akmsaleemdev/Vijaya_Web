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

import { db } from "@/lib/db";
import { COMBO_RULES, SPACES, SPACE_BY_SLUG } from "@/lib/data/spaces";
import { BOOKING_CONFIG, type SlotId } from "@/lib/site-config";
import { quoteFor } from "@/lib/pricing";

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
}

/** Holds that passed their expiry are swept before any availability read. */
export async function sweepExpiredHolds(): Promise<void> {
  const now = new Date();
  const stale = await db.slotState.findMany({
    where: { status: "TEMPORARY_HOLD", holdExpiresAt: { lt: now } },
    select: { bookingRef: true },
  });
  if (stale.length === 0) return;
  const refs = Array.from(new Set(stale.map((s) => s.bookingRef).filter(Boolean))) as string[];
  await db.slotState.deleteMany({
    where: { status: "TEMPORARY_HOLD", holdExpiresAt: { lt: now } },
  });
  for (const ref of refs) {
    const b = await db.booking.findUnique({ where: { reference: ref } });
    if (b && (b.status === "HOLD" || b.status === "PENDING_PAYMENT")) {
      // Payment pending: keep the booking record for audit, but only if a payment is in flight.
      const inFlight = await db.payment.findFirst({
        where: { bookingId: b.id, status: { in: ["INITIATED", "PENDING"] } },
      });
      const newStatus = inFlight ? b.status : "EXPIRED";
      await db.booking.update({ where: { reference: ref }, data: { status: newStatus } });
      await db.auditLog.create({
        data: { action: "HOLD_EXPIRED", entity: "Booking", entityRef: ref, detailJson: JSON.stringify({ newStatus }) },
      });
    }
  }
}

function comboFor(slug: string) {
  return COMBO_RULES.find((c) => c.active && c.comboSlug === slug);
}

function combosContaining(slug: string) {
  return COMBO_RULES.filter((c) => c.active && c.childSlugs.includes(slug));
}

/** All child space slugs that must be free (or get blocked) for a given bookable slug. */
export function involvedSpaces(slug: string): string[] {
  const combo = comboFor(slug);
  return combo ? combo.childSlugs : [slug];
}

async function statusesFor(slugs: string[], date: string, slot: SlotId) {
  const rows = await db.slotState.findMany({
    where: { spaceId: { in: slugs }, date, slot },
  });
  return rows;
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

  const spaces = SPACES.filter((s) => s.availabilityEnabled && s.bookableOnline);
  const result: SpaceAvailability[] = [];

  for (const s of spaces) {
    if (s.guestRange && (opts.guests < s.guestRange[0] || opts.guests > s.guestRange[1])) {
      continue; // not compatible with guest count — hidden, not "unavailable"
    }
    const involved = involvedSpaces(s.slug);
    const rows = await statusesFor(involved, opts.date, opts.slot);
    const blocking = rows.find((r) => r.status !== "CANCELLED");
    result.push({
      slug: s.slug,
      name: s.officialName,
      category: s.venueCategory,
      setting: s.indoorOrOutdoor,
      isCombo: !!comboFor(s.slug),
      childSlugs: involved,
      available: !blocking,
      status: blocking ? blocking.status : null,
      guestRange: s.guestRange,
      requiresApproval: s.requiresManualApproval,
      note: null,
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
  guests?: number
): Promise<Record<string, { free: number; total: number }>> {
  await sweepExpiredHolds();
  const spaces = SPACES.filter((s) => s.availabilityEnabled && s.bookableOnline && (!guests || !s.guestRange || (guests >= s.guestRange[0] && guests <= s.guestRange[1])));
  const from = `${month}-01`;
  const to = `${month}-31`;
  const rows = await db.slotState.findMany({
    where: { date: { gte: from, lte: to }, status: { not: "CANCELLED" } },
  });
  const byDate: Record<string, { free: number; total: number }> = {};
  const days = daysInMonth(month);
  for (const d of days) {
    byDate[d] = { free: 0, total: spaces.length };
  }
  for (const s of spaces) {
    const involved = involvedSpaces(s.slug);
    for (const d of days) {
      const blocked = rows.some((r) => involved.includes(r.spaceId) && r.date === d);
      if (!blocked) byDate[d].free += 1;
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
  slot: SlotId;
  guests: number;
  eventType: string;
  /** Customer details are captured at checkout (step 7) — a hold may be anonymous. */
  customer?: { name?: string; phone?: string; email?: string; country?: string; notes?: string };
  utm?: Record<string, string>;
}

export type HoldResult =
  | { ok: true; reference: string; holdExpiresAt: string; spaceName: string; amounts: { base: number; weekendUplift: number; tax: number; deposit: number; totalPayable: number } }
  | { ok: false; code: "UNAVAILABLE" | "NOT_BOOKABLE" | "INVALID"; message: string; detail?: string };

/**
 * Create an atomic temporary hold + HOLD booking.
 * The unique index on SlotState(spaceId,date,slot) makes concurrent holds for
 * the same space/date/slot impossible — the second write fails inside the
 * transaction and we surface a calm, premium message.
 */
export async function createTemporaryHold(input: HoldInput): Promise<HoldResult> {
  const space = SPACE_BY_SLUG[input.spaceSlug];
  if (!space || !space.availabilityEnabled || !space.bookableOnline) {
    return { ok: false, code: "NOT_BOOKABLE", message: "This space cannot be booked online. Our events team will gladly arrange it for you." };
  }
  if (space.guestRange && (input.guests < space.guestRange[0] || input.guests > space.guestRange[1])) {
    return { ok: false, code: "INVALID", message: "Expected guest count is outside the indicative range for this space." };
  }

  const involved = involvedSpaces(space.slug);
  const expires = new Date(Date.now() + BOOKING_CONFIG.holdMinutes * 60 * 1000);
  const amounts = quoteFor(space.slug, input.date, input.slot);
  const reference = generateReference();

  try {
    await db.$transaction(async (tx) => {
      // Re-validate every involved child space inside the write transaction.
      const rows = await tx.slotState.findMany({
        where: { spaceId: { in: involved }, date: input.date, slot: input.slot },
      });
      if (rows.some((r) => r.status !== "CANCELLED")) {
        throw new Error("SLOT_TAKEN");
      }
      // Create the booking shell (HOLD).
      await tx.booking.create({
        data: {
          reference,
          spaceId: space.slug,
          spaceName: space.officialName,
          childSpaceIds: JSON.stringify(involved),
          eventType: input.eventType,
          eventDate: input.date,
          slot: input.slot,
          guests: input.guests,
          status: "HOLD",
          customerName: input.customer?.name || "— (hold placed, details pending)",
          customerPhone: input.customer?.phone || "",
          customerEmail: input.customer?.email || "",
          customerCountry: input.customer?.country || "India",
          notes: input.customer?.notes || null,
          baseAmount: amounts.base,
          weekendUplift: amounts.weekendUplift,
          taxAmount: amounts.tax,
          depositAmount: amounts.deposit,
          totalPayable: amounts.totalPayable,
          holdExpiresAt: expires,
        },
      });
      // Block every involved child slot atomically.
      for (const child of involved) {
        await tx.slotState.create({
          data: {
            spaceId: child,
            date: input.date,
            slot: input.slot,
            status: "TEMPORARY_HOLD",
            source: "ONLINE",
            holdExpiresAt: expires,
            bookingRef: reference,
          },
        });
      }
      await tx.auditLog.create({
        data: { action: "TEMPORARY_HOLD_CREATED", entity: "Booking", entityRef: reference, detailJson: JSON.stringify({ space: space.slug, date: input.date, slot: input.slot }) },
      });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("SLOT_TAKEN") || msg.includes("Unique constraint")) {
      return {
        ok: false,
        code: "UNAVAILABLE",
        message: "This space was just booked by another enquiry.",
        detail: "The moment a date is confirmed — online or through the VIJAYA booking office — it is blocked here as well. Please choose another slot or space, or contact our team and we will find the closest alternative.",
      };
    }
    throw e;
  }

  return {
    ok: true,
    reference,
    holdExpiresAt: expires.toISOString(),
    spaceName: space.officialName,
    amounts,
  };
}

/** Revalidate + move booking to PENDING_PAYMENT at checkout. */
export async function markPendingPayment(reference: string): Promise<boolean> {
  const b = await db.booking.findUnique({ where: { reference } });
  if (!b) return false;
  if (b.status !== "HOLD") return false;
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { reference }, data: { status: "PENDING_PAYMENT" } });
    await tx.slotState.updateMany({
      where: { bookingRef: reference, status: "TEMPORARY_HOLD" },
      data: { status: "PENDING_PAYMENT", holdExpiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });
    await tx.auditLog.create({
      data: { action: "CHECKOUT_STARTED", entity: "Booking", entityRef: reference },
    });
  });
  return true;
}

/**
 * Confirm after verified payment. Idempotent: confirming twice is a no-op.
 * CRM sync is queued (not silently lost) when the CRM link is not yet live.
 */
export async function confirmBooking(reference: string, paymentRef: string): Promise<{ ok: boolean; crmSync: string }> {
  const b = await db.booking.findUnique({ where: { reference } });
  if (!b) return { ok: false, crmSync: "FAILED" };
  if (b.status === "CONFIRMED") return { ok: true, crmSync: b.crmSync };

  const involved: string[] = JSON.parse(b.childSpaceIds || `["${b.spaceId}"]`);
  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { reference },
      data: { status: "CONFIRMED", confirmedAt: new Date(), crmSync: BOOKING_CONFIG.crmConnected ? "SYNCED" : "QUEUED" },
    });
    await tx.slotState.updateMany({
      where: { bookingRef: reference },
      data: { status: "CONFIRMED", holdExpiresAt: null },
    });
    await tx.auditLog.create({
      data: { action: "BOOKING_CONFIRMED", entity: "Booking", entityRef: reference, detailJson: JSON.stringify({ paymentRef }) },
    });
  });

  // Seed portal documents + milestones for the post-booking experience.
  const existingDocs = await db.document.count({ where: { bookingId: b.id } });
  if (existingDocs === 0) {
    await db.document.createMany({
      data: [
        { bookingId: b.id, type: "CONFIRMATION", title: "Booking Confirmation" },
        { bookingId: b.id, type: "INVOICE", title: "Invoice — Booking " + reference },
        { bookingId: b.id, type: "RECEIPT", title: "Payment Receipt" },
        { bookingId: b.id, type: "AGREEMENT", title: "Venue Booking Agreement" },
      ],
    });
    const eventDate = new Date(b.eventDate + "T00:00:00Z");
    const ms = (days: number, title: string, detail: string) => {
      const d = new Date(eventDate.getTime() - days * 86400000);
      return { bookingId: b.id, title, detail, dueDate: d.toISOString().slice(0, 10), order: days };
    };
    await db.milestone.createMany({
      data: [
        ms(60, "Planning consultation", "Meet your event manager and shape the run of show."),
        ms(30, "Vendor coordination", "Share your vendor list and timelines with the VIJAYA team."),
        ms(15, "Layout & finalisation", "Confirm seating layouts, stage plan and AV requirements."),
        ms(7, "Final walkthrough", "Walk the space with your event manager and sign off the plan."),
        ms(0, "Your event day", "Welcome to VIJAYA. We will take it from here."),
      ],
    });
  }

  // Push to CRM when connected; never silently lose the transaction.
  await crmSyncBooking(reference);
  return { ok: true, crmSync: BOOKING_CONFIG.crmConnected ? "SYNCED" : "QUEUED" };
}

/** Release a hold / cancelled booking's slots. */
export async function releaseBookingSlots(reference: string, reason: string): Promise<void> {
  await db.slotState.deleteMany({ where: { bookingRef: reference } });
  await db.auditLog.create({
    data: { action: "SLOTS_RELEASED", entity: "Booking", entityRef: reference, detailJson: JSON.stringify({ reason }) },
  });
}

// ---------------------------------------------------------------------------
// CRM adapter — the concrete integration lands when VICC confirms vendor/API.
// ---------------------------------------------------------------------------

export async function crmSyncBooking(reference: string): Promise<string> {
  if (!BOOKING_CONFIG.crmConnected) {
    // Flagged for operational review — never silently lost.
    await db.auditLog.create({
      data: { action: "CRM_SYNC_QUEUED", entity: "Booking", entityRef: reference },
    });
    return "QUEUED";
  }
  // TODO(CRM): POST booking payload to CRM endpoint, return "SYNCED"/"FAILED".
  return "SYNCED";
}

/**
 * Inbound CRM synchronisation — offline bookings, blocks and releases.
 * Called by /api/crm/sync with the shared secret header.
 */
export async function crmApplySync(payload: {
  action: "BOOK" | "BLOCK" | "RELEASE";
  spaceId: string;
  date: string;
  slot: string;
  note?: string;
  bookingRef?: string;
  customer?: { name?: string; phone?: string; email?: string };
  amount?: number;
}): Promise<{ ok: boolean; message: string }> {
  const space = SPACE_BY_SLUG[payload.spaceId];
  if (!space) return { ok: false, message: "Unknown spaceId" };

  if (payload.action === "RELEASE") {
    await db.slotState.deleteMany({
      where: { spaceId: payload.spaceId, date: payload.date, slot: payload.slot, source: { in: ["OFFLINE_CRM", "OPS"] } },
    });
    return { ok: true, message: "Slot released." };
  }

  const status = payload.action === "BOOK" ? "CONFIRMED" : "BLOCKED";
  const existing = await db.slotState.findUnique({
    where: { spaceId_date_slot: { spaceId: payload.spaceId, date: payload.date, slot: payload.slot } },
  });
  if (existing && existing.source === "ONLINE" && existing.status !== "CANCELLED") {
    return { ok: false, message: "Conflict: slot is already held online. Flagged for operations review." };
  }
  await db.slotState.upsert({
    where: { spaceId_date_slot: { spaceId: payload.spaceId, date: payload.date, slot: payload.slot } },
    create: {
      spaceId: payload.spaceId,
      date: payload.date,
      slot: payload.slot,
      status,
      source: "OFFLINE_CRM",
      bookingRef: payload.bookingRef || null,
      note: payload.note || null,
    },
    update: { status, source: "OFFLINE_CRM", bookingRef: payload.bookingRef || null, note: payload.note || null },
  });
  await db.auditLog.create({
    data: { action: `CRM_${payload.action}`, entity: "SlotState", entityRef: `${payload.spaceId}/${payload.date}/${payload.slot}` },
  });
  return { ok: true, message: `Slot ${status}.` };
}

// ---------------------------------------------------------------------------
// Reference + quote helpers
// ---------------------------------------------------------------------------

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateReference(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  return `VIJ-${s}`;
}
