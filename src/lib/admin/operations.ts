import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { bookingTransaction } from "@/lib/booking/transaction";
import { dates, indiaDate } from "@/lib/booking/slots";
import { expireHolds } from "@/lib/booking/state";
import { priceConfig } from "@/lib/booking/price-config";
import { roles } from "./auth";
import { audit, failure, success, type Identity } from "./http";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(90);
const venueInput = z.object({
  id: slug, name: z.string().trim().min(1).max(120), category: z.enum(["WEDDING", "BUSINESS", "CELEBRATION", "MULTI"]),
  setting: z.enum(["INDOOR", "OUTDOOR"]), description: z.string().max(6000).optional(),
  capacityMin: z.coerce.number().int().nonnegative().max(100000), capacityMax: z.coerce.number().int().positive().max(100000),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0), active: z.boolean(),
  requiresApproval: z.boolean(), bookableOnline: z.boolean(), availabilityEnabled: z.boolean(), pricing: priceConfig.optional(),
}).refine((value) => value.capacityMin <= value.capacityMax);
const sessionInput = z.object({
  spaceId: slug, key: z.string().regex(/^[A-Z][A-Z0-9_]{0,39}$/),
  label: z.string().min(1).max(80), startMinute: z.coerce.number().int().min(0).max(1439),
  endMinute: z.coerce.number().int().min(1).max(1440), enabled: z.boolean(),
}).refine((x) => x.startMinute < x.endMinute && (x.key !== "FULL_DAY" || (x.startMinute === 0 && x.endMinute === 1440)));

export async function venues(req: Request, actor: Identity, id?: string) {
  if (req.method === "GET") return success(await db.space.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }));
  if (req.method === "DELETE") {
    return bookingTransaction(async (tx) => {
      const before = id && await tx.space.findUnique({ where: { id } });
      if (!before) return failure(404, "NOT_FOUND", "Venue not found.");
      const after = await tx.space.update({ where: { id: before.id }, data: { active: false, bookableOnline: false } });
      await audit(tx, actor, "VENUE_ARCHIVED", "Space", before.id, before, after);
      return success(after);
    });
  }
  const result = venueInput.safeParse(await req.json().catch(() => null));
  if (!result.success) return failure(422, "INVALID_VENUE", "Check the venue fields and capacity range.", result.error.issues);
  const { id: venueId, pricing, ...values } = result.data;
  return bookingTransaction(async (tx) => {
    const before = await tx.space.findUnique({ where: { id: venueId } });
    const data = { ...values, pricingJson: pricing ? JSON.stringify(pricing) : undefined };
    const after = await tx.space.upsert({ where: { id: venueId }, create: { id: venueId, ...data }, update: data });
    await audit(tx, actor, before ? "VENUE_UPDATED" : "VENUE_CREATED", "Space", venueId, before, after);
    return success(after);
  });
}

export async function sessions(req: Request, actor: Identity) {
  if (req.method === "GET") return success(await db.sessionConfig.findMany({ orderBy: [{ spaceId: "asc" }, { startMinute: "asc" }] }));
  const parsed = sessionInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failure(422, "INVALID_SESSION", "Enter a valid date-independent session between minute 0 and 1440.");
  const { spaceId, key, ...fields } = parsed.data;
  return bookingTransaction(async (tx) => {
    if (!await tx.space.findUnique({ where: { id: spaceId } })) return failure(404, "NOT_FOUND", "Venue not found.");
    const where = { spaceId_key: { spaceId, key } };
    const before = await tx.sessionConfig.findUnique({ where });
    const after = await tx.sessionConfig.upsert({ where, create: { spaceId, key, ...fields }, update: fields });
    await audit(tx, actor, "SESSION_SAVED", "SessionConfig", after.id, before, after);
    return success(after);
  });
}

const pipeline = z.enum(["NEW", "CONTACTED", "SITE_VISIT", "QUOTED", "WON", "LOST"]);
const leadInput = z.object({ stage: pipeline, notes: z.string().max(6000).optional(), followUpAt: z.iso.date().nullable().optional() });
export async function enquiries(req: Request, actor: Identity, id?: string) {
  if (req.method === "GET") return success(await db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 250 }));
  const parsed = leadInput.safeParse(await req.json().catch(() => null));
  if (!id || !parsed.success) return failure(422, "INVALID_ENQUIRY", "Choose a pipeline stage and valid follow-up date.");
  return bookingTransaction(async (tx) => {
    const before = await tx.lead.findUnique({ where: { id } });
    if (!before) return failure(404, "NOT_FOUND", "Enquiry not found.");
    const { stage, notes, followUpAt } = parsed.data;
    const after = await tx.lead.update({ where: { id }, data: { stage, internalNotes: notes, followUpAt: followUpAt ? new Date(followUpAt + "T09:00:00+05:30") : followUpAt } });
    await audit(tx, actor, "ENQUIRY_UPDATED", "Lead", id, { stage: before.stage, followUpAt: before.followUpAt }, { stage, followUpAt });
    return success(after);
  });
}

const customerInput = z.object({ email: z.email().toLowerCase().max(160), note: z.string().trim().min(1).max(4000) });
export async function customers(req: Request, actor: Identity) {
  if (req.method === "GET") {
    const email = z.email().safeParse(new URL(req.url).searchParams.get("email"));
    if (email.success) return success({
      bookings: await db.booking.findMany({ where: { customerEmail: email.data }, select: { reference: true, eventDate: true, status: true, spaceName: true, payments: { select: { amount: true, status: true } } }, orderBy: { eventDate: "desc" } }),
      notes: await db.customerNote.findMany({ where: { email: email.data }, orderBy: { createdAt: "desc" } }),
    });
    const rows = await db.booking.groupBy({ by: ["customerEmail"], where: { customerEmail: { not: "" } }, _count: { _all: true }, _max: { customerName: true, eventDate: true }, orderBy: { _max: { eventDate: "desc" } }, take: 200 });
    return success(rows);
  }
  const parsed = customerInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failure(422, "INVALID_NOTE", "Enter a valid customer email and note.");
  return bookingTransaction(async (tx) => {
    if (!await tx.booking.findFirst({ where: { customerEmail: parsed.data.email } })) return failure(404, "NOT_FOUND", "Customer not found.");
    const note = await tx.customerNote.create({ data: { ...parsed.data, actorId: actor.admin.id } });
    await audit(tx, actor, "CUSTOMER_NOTE_ADDED", "CustomerNote", note.id);
    return success(note);
  });
}

const adminSelect = { id: true, name: true, email: true, role: true, disabled: true, mustChangePassword: true, createdAt: true } as const;
const password = z.string().min(12).refine((x) => Buffer.byteLength(x) <= 72);
const adminInput = z.object({ email: z.email().toLowerCase().max(160), name: z.string().trim().min(1).max(120), role: roles, password });
const adminUpdate = z.object({ role: roles.optional(), disabled: z.boolean().optional(), password: password.optional(), revoke: z.boolean().optional() });
export async function users(req: Request, actor: Identity, id?: string) {
  if (req.method === "GET") return success(await db.adminUser.findMany({ select: { ...adminSelect }, orderBy: { email: "asc" } }));
  if (req.method === "POST") {
    const checked = adminInput.safeParse(await req.json().catch(() => null));
    if (!checked.success) return failure(422, "INVALID_USER", "Enter an email, role and temporary password of at least 12 characters.");
    const { password, ...details } = checked.data;
    const passwordHash = await hash(password, 12);
    return bookingTransaction(async (tx) => {
      if (await tx.adminUser.findUnique({ where: { email: details.email } })) return failure(409, "EMAIL_IN_USE", "That email is already registered.");
      const user = await tx.adminUser.create({ data: { ...details, passwordHash }, select: adminSelect });
      await audit(tx, actor, "ADMIN_CREATED", "AdminUser", user.id, undefined, user);
      return success(user, 201);
    });
  }
  const parsed = adminUpdate.safeParse(await req.json().catch(() => null));
  if (!id || !parsed.success) return failure(422, "INVALID_USER", "Enter valid user changes.");
  const { role, disabled, password: temporary } = parsed.data;
  if (actor.admin.id === id && (role && role !== "SUPER_ADMIN" || disabled || temporary)) return failure(409, "SELF_UPDATE", "Use the password page for your own account. You cannot disable or demote yourself.");
  const passwordHash = temporary ? await hash(temporary, 12) : undefined;
  return bookingTransaction(async (tx) => {
    const before = await tx.adminUser.findUnique({ where: { id }, select: adminSelect });
    if (!before) return failure(404, "NOT_FOUND", "Account not found.");
    if (before.role === "SUPER_ADMIN" && !before.disabled && (disabled || (role && role !== "SUPER_ADMIN"))) {
      if (await tx.adminUser.count({ where: { role: "SUPER_ADMIN", disabled: false } }) <= 1) return failure(409, "LAST_ADMIN", "The last active Super Admin cannot be removed.");
    }
    const after = await tx.adminUser.update({ where: { id }, data: { role, disabled, passwordHash, mustChangePassword: temporary ? true : undefined, sessionVersion: { increment: 1 } }, select: adminSelect });
    await tx.adminSession.deleteMany({ where: { adminId: id } });
    await audit(tx, actor, "ADMIN_UPDATED", "AdminUser", id, before, after);
    return success(after);
  });
}

const calendarInput = z.object({ from: dates, to: dates, venue: z.string().max(100).optional() });
export async function calendar(req: Request) {
  const checked = calendarInput.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!checked.success || checked.data.from > checked.data.to || Date.parse(checked.data.to) - Date.parse(checked.data.from) > 62 * 86400000) {
    return failure(422, "INVALID_RANGE", "Choose a calendar range of up to 63 days.");
  }
  await expireHolds();
  const { from, to, venue } = checked.data;
  return success(await db.slotState.findMany({
    where: { date: { gte: from, lte: to }, spaceId: venue, status: { not: "CANCELLED" } },
    orderBy: [{ date: "asc" }, { spaceId: "asc" }, { startMinute: "asc" }],
    include: { space: { select: { name: true } } },
  }));
}

export async function dashboard() {
  await expireHolds();
  const now = new Date();
  const today = indiaDate(now);
  const end = (days: number) => indiaDate(new Date(now.getTime() + days * 86400000));
  const yearAgo = end(-365);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [bookings, monthly, newEnquiries, expiring] = await Promise.all([
    db.booking.findMany({ where: { OR: [{ eventDate: { gte: yearAgo } }, { status: "CONFIRMED" }] }, include: { payments: true }, orderBy: { eventDate: "asc" } }),
    db.payment.findMany({ where: { status: "SUCCESS", createdAt: { gte: new Date(monthStart + "T00:00:00+05:30") } }, select: { amount: true } }),
    db.lead.count({ where: { stage: { in: ["NEW", "New Lead"] } } }),
    db.booking.findMany({ where: { holdExpiresAt: { gt: now, lte: new Date(now.getTime() + 15 * 60_000) } }, take: 10, orderBy: { holdExpiresAt: "asc" }, select: { reference: true, eventDate: true, spaceName: true, holdExpiresAt: true } }),
  ]);
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const pending = bookings.filter((b) => ["HOLD", "PENDING_PAYMENT", "PENDING_APPROVAL"].includes(b.status));
  const group = (values: string[]) => Array.from(values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>()), ([name, count]) => ({ name, count }));
  const history = bookings.filter((b) => b.eventDate >= yearAgo && ["CONFIRMED", "COMPLETED", "NO_SHOW"].includes(b.status));
  const revenue = new Map<string, number>();
  for (const b of bookings) for (const p of b.payments) if (p.status === "SUCCESS") {
    const month = indiaDate(p.paidAt ?? p.createdAt).slice(0, 7);
    revenue.set(month, (revenue.get(month) ?? 0) + p.amount);
  }
  const list = (rows: typeof bookings) => rows.slice(0, 10).map(({ reference, eventDate, spaceName, status }) => ({ reference, eventDate, spaceName, status }));
  return success({
    kpis: {
      "Today's events": confirmed.filter((b) => b.eventDate === today).length,
      "Next 7 days": confirmed.filter((b) => b.eventDate >= today && b.eventDate < end(7)).length,
      "Next 30 days": confirmed.filter((b) => b.eventDate >= today && b.eventDate < end(30)).length,
      "Pending approvals": pending.length, "New enquiries": newEnquiries,
      "Monthly revenue": monthly.reduce((sum, p) => sum + p.amount, 0),
      "Outstanding balance": confirmed.reduce((sum, b) => sum + Math.max(0, b.baseAmount + b.weekendUplift + b.taxAmount - b.payments.reduce((paid, p) => paid + (p.status === "SUCCESS" ? p.amount : 0), 0)), 0),
    },
    charts: { "Bookings per month": group(history.map((b) => b.eventDate.slice(0, 7))), "Revenue trend": Array.from(revenue, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)).slice(-12), "Venue activity": group(history.map((b) => b.spaceName)), "Event types": group(history.map((b) => b.eventType)) },
    next: list(confirmed.filter((b) => b.eventDate >= today)), pending: list(pending), expiring,
  });
}

export async function auditLog(req: Request) {
  const query = new URL(req.url).searchParams;
  const where = { entity: query.get("entity")?.slice(0, 100) || undefined, action: query.get("action")?.slice(0, 100) || undefined };
  const rows = await db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: query.get("export") === "json" ? 5000 : 200 });
  if (query.get("export") === "json") return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="vijaya-audit.json"', "Cache-Control": "no-store" } });
  return success(rows);
}
