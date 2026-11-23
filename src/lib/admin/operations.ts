import { invalidateContent } from "@/lib/cms/revalidate";
import { totalContract } from "@/lib/booking/amounts";
import { hash } from "bcryptjs";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import type {
  AdminUser, AuditLog, Booking, CustomerNote, Lead, Payment,
  SessionConfig, SlotState, Space,
} from "@/lib/db/types";
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
  if (req.method === "GET") {
    const { rows } = await query<Space>(`SELECT * FROM vijaya."Space" ORDER BY "sortOrder" ASC, "name" ASC`);
    return success(rows);
  }
  if (req.method === "DELETE") {
    const archived = await bookingTransaction(async (tx) => {
      const { rows: [before] } = await tx.query<Space>(`SELECT * FROM vijaya."Space" WHERE "id" = $1`, [id]);
      if (!before) return failure(404, "NOT_FOUND", "Venue not found.");
      const { rows: [after] } = await tx.query<Space>(
        `UPDATE vijaya."Space" SET "active" = false, "bookableOnline" = false, "updatedAt" = now()
         WHERE "id" = $1 RETURNING *`,
        [before.id],
      );
      if (!after) throw new Error("Venue archive returned no row.");
      await audit(tx, actor, "VENUE_ARCHIVED", "Space", before.id, before, after);
      return success(after);
    });
    if (archived.ok && id) invalidateContent("venue." + id);
    return archived;
  }
  const result = venueInput.safeParse(await req.json().catch(() => null));
  if (!result.success) return failure(422, "INVALID_VENUE", "Check the venue fields and capacity range.", result.error.issues);
  const { id: venueId, pricing, ...values } = result.data;
  const saved = await bookingTransaction(async (tx) => {
    const { rows: [before] } = await tx.query<Space>(`SELECT * FROM vijaya."Space" WHERE "id" = $1`, [venueId]);
    const { rows: [after] } = await tx.query<Space>(
      `INSERT INTO vijaya."Space"
        ("id","name","category","setting","description","capacityMin","capacityMax","sortOrder","active",
         "requiresApproval","bookableOnline","availabilityEnabled","pricingJson","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())
       ON CONFLICT ("id") DO UPDATE SET
         "name" = EXCLUDED."name", "category" = EXCLUDED."category", "setting" = EXCLUDED."setting",
         "description" = EXCLUDED."description", "capacityMin" = EXCLUDED."capacityMin", "capacityMax" = EXCLUDED."capacityMax",
         "sortOrder" = EXCLUDED."sortOrder", "active" = EXCLUDED."active", "requiresApproval" = EXCLUDED."requiresApproval",
         "bookableOnline" = EXCLUDED."bookableOnline", "availabilityEnabled" = EXCLUDED."availabilityEnabled",
         "pricingJson" = CASE WHEN $13::text IS NULL THEN vijaya."Space"."pricingJson" ELSE EXCLUDED."pricingJson" END,
         "updatedAt" = now()
       RETURNING *`,
      [venueId, values.name, values.category, values.setting, values.description ?? null, values.capacityMin,
        values.capacityMax, values.sortOrder, values.active, values.requiresApproval, values.bookableOnline,
        values.availabilityEnabled, pricing ? JSON.stringify(pricing) : null],
    );
    if (!after) throw new Error("Venue write returned no row.");
    await audit(tx, actor, before ? "VENUE_UPDATED" : "VENUE_CREATED", "Space", venueId, before, after);
    return success(after);
  });
  if (saved.ok) invalidateContent("venue." + venueId);
  return saved;
}

export async function sessions(req: Request, actor: Identity) {
  if (req.method === "GET") {
    const { rows } = await query<SessionConfig>(`SELECT * FROM vijaya."SessionConfig" ORDER BY "spaceId" ASC, "startMinute" ASC`);
    return success(rows);
  }
  const parsed = sessionInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failure(422, "INVALID_SESSION", "Enter a valid date-independent session between minute 0 and 1440.");
  const { spaceId, key, ...fields } = parsed.data;
  return bookingTransaction(async (tx) => {
    const { rows: [space] } = await tx.query<{ id: string }>(`SELECT "id" FROM vijaya."Space" WHERE "id" = $1`, [spaceId]);
    if (!space) return failure(404, "NOT_FOUND", "Venue not found.");
    const { rows: [before] } = await tx.query<SessionConfig>(
      `SELECT * FROM vijaya."SessionConfig" WHERE "spaceId" = $1 AND "key" = $2`,
      [spaceId, key],
    );
    const { rows: [after] } = await tx.query<SessionConfig>(
      `INSERT INTO vijaya."SessionConfig" ("id","spaceId","key","label","startMinute","endMinute","enabled")
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT ("spaceId","key") DO UPDATE SET "label" = EXCLUDED."label", "startMinute" = EXCLUDED."startMinute",
         "endMinute" = EXCLUDED."endMinute", "enabled" = EXCLUDED."enabled"
       RETURNING *`,
      [randomUUID(), spaceId, key, fields.label, fields.startMinute, fields.endMinute, fields.enabled],
    );
    if (!after) throw new Error("Session config write returned no row.");
    await audit(tx, actor, "SESSION_SAVED", "SessionConfig", after.id, before, after);
    return success(after);
  });
}

const pipeline = z.enum(["NEW", "CONTACTED", "SITE_VISIT", "QUOTED", "WON", "LOST"]);
const leadInput = z.object({ stage: pipeline, notes: z.string().max(6000).optional(), followUpAt: z.iso.date().nullable().optional() });
export async function enquiries(req: Request, actor: Identity, id?: string) {
  if (req.method === "GET") {
    const { rows } = await query<Lead>(`SELECT * FROM vijaya."Lead" ORDER BY "createdAt" DESC LIMIT 250`);
    return success(rows);
  }
  const parsed = leadInput.safeParse(await req.json().catch(() => null));
  if (!id || !parsed.success) return failure(422, "INVALID_ENQUIRY", "Choose a pipeline stage and valid follow-up date.");
  return bookingTransaction(async (tx) => {
    const { rows: [before] } = await tx.query<Lead>(`SELECT * FROM vijaya."Lead" WHERE "id" = $1`, [id]);
    if (!before) return failure(404, "NOT_FOUND", "Enquiry not found.");
    const { stage, notes, followUpAt } = parsed.data;
    const date = followUpAt ? new Date(followUpAt + "T09:00:00+05:30") : null;
    const { rows: [after] } = await tx.query<Lead>(
      `UPDATE vijaya."Lead"
       SET "stage" = $2, "internalNotes" = CASE WHEN $3 THEN $4 ELSE "internalNotes" END,
           "followUpAt" = CASE WHEN $5 THEN $6 ELSE "followUpAt" END
       WHERE "id" = $1 RETURNING *`,
      [id, stage, notes !== undefined, notes ?? null, followUpAt !== undefined, date],
    );
    if (!after) throw new Error("Lead update returned no row.");
    await audit(tx, actor, "ENQUIRY_UPDATED", "Lead", id, { stage: before.stage, followUpAt: before.followUpAt }, { stage, followUpAt });
    return success(after);
  });
}

const customerInput = z.object({ email: z.email().toLowerCase().max(160), note: z.string().trim().min(1).max(4000) });
export async function customers(req: Request, actor: Identity) {
  if (req.method === "GET") {
    const email = z.email().safeParse(new URL(req.url).searchParams.get("email"));
    if (email.success) {
      const [{ rows: bookings }, { rows: notes }] = await Promise.all([
        query<Pick<Booking, "reference" | "eventDate" | "status" | "spaceName"> & { payments: Pick<Payment, "amount" | "status">[] }>(
          `SELECT b."reference", b."eventDate", b."status"::text AS "status", b."spaceName",
             COALESCE((SELECT json_agg(json_build_object('amount', p."amount", 'status', p."status"))
                       FROM vijaya."Payment" p WHERE p."bookingId" = b."id"), '[]'::json) AS payments
           FROM vijaya."Booking" b WHERE lower(b."customerEmail") = $1 ORDER BY b."eventDate" DESC`,
          [email.data],
        ),
        query<CustomerNote>(`SELECT * FROM vijaya."CustomerNote" WHERE lower("email") = $1 ORDER BY "createdAt" DESC`, [email.data]),
      ]);
      return success({ bookings, notes });
    }
    const { rows } = await query(
      `SELECT "customerEmail", count(*) AS "_count", max("customerName") AS "_maxCustomerName",
         max("eventDate") AS "_maxEventDate"
       FROM vijaya."Booking" WHERE "customerEmail" <> ''
       GROUP BY "customerEmail" ORDER BY max("eventDate") DESC LIMIT 200`,
    );
    return success(rows);
  }
  const parsed = customerInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failure(422, "INVALID_NOTE", "Enter a valid customer email and note.");
  return bookingTransaction(async (tx) => {
    const { rows: [booking] } = await tx.query<{ id: string }>(
      `SELECT "id" FROM vijaya."Booking" WHERE lower("customerEmail") = $1 LIMIT 1`,
      [parsed.data.email],
    );
    if (!booking) return failure(404, "NOT_FOUND", "Customer not found.");
    const { rows: [note] } = await tx.query<CustomerNote>(
      `INSERT INTO vijaya."CustomerNote" ("id","email","note","actorId","createdAt")
       VALUES ($1,$2,$3,$4,now()) RETURNING *`,
      [randomUUID(), parsed.data.email, parsed.data.note, actor.admin.id],
    );
    if (!note) throw new Error("Customer note insert returned no row.");
    await audit(tx, actor, "CUSTOMER_NOTE_ADDED", "CustomerNote", note.id);
    return success(note);
  });
}

const adminSelect = { id: true, name: true, email: true, role: true, disabled: true, mustChangePassword: true, createdAt: true } as const;
const password = z.string().min(12).refine((x) => Buffer.byteLength(x) <= 72);
const adminInput = z.object({ email: z.email().toLowerCase().max(160), name: z.string().trim().min(1).max(120), role: roles, password });
const adminUpdate = z.object({ role: roles.optional(), disabled: z.boolean().optional(), password: password.optional(), revoke: z.boolean().optional() });
export async function users(req: Request, actor: Identity, id?: string) {
  if (req.method === "GET") {
    const { rows } = await query<Pick<AdminUser, "id" | "name" | "email" | "role" | "disabled" | "mustChangePassword" | "createdAt">>(
      `SELECT "id","name","email","role","disabled","mustChangePassword","createdAt" FROM vijaya."AdminUser" ORDER BY "email" ASC`,
    );
    return success(rows);
  }
  if (req.method === "POST") {
    const checked = adminInput.safeParse(await req.json().catch(() => null));
    if (!checked.success) return failure(422, "INVALID_USER", "Enter an email, role and temporary password of at least 12 characters.");
    const { password, ...details } = checked.data;
    const passwordHash = await hash(password, 12);
    return bookingTransaction(async (tx) => {
      const { rows: [existing] } = await tx.query<{ id: string }>(
        `SELECT "id" FROM vijaya."AdminUser" WHERE lower("email") = $1`,
        [details.email],
      );
      if (existing) return failure(409, "EMAIL_IN_USE", "That email is already registered.");
      const { rows: [user] } = await tx.query<Pick<AdminUser, "id" | "name" | "email" | "role" | "disabled" | "mustChangePassword" | "createdAt">>(
        `INSERT INTO vijaya."AdminUser" ("id","name","email","role","passwordHash","disabled","mustChangePassword","sessionVersion","createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,false,true,0,now(),now())
         RETURNING "id","name","email","role","disabled","mustChangePassword","createdAt"`,
        [randomUUID(), details.name, details.email, details.role, passwordHash],
      );
      if (!user) throw new Error("Admin user insert returned no row.");
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
    const { rows: [before] } = await tx.query<Pick<AdminUser, "id" | "name" | "email" | "role" | "disabled" | "mustChangePassword" | "createdAt">>(
      `SELECT "id","name","email","role","disabled","mustChangePassword","createdAt" FROM vijaya."AdminUser" WHERE "id" = $1`,
      [id],
    );
    if (!before) return failure(404, "NOT_FOUND", "Account not found.");
    if (before.role === "SUPER_ADMIN" && !before.disabled && (disabled || (role && role !== "SUPER_ADMIN"))) {
      const { rows: [count] } = await tx.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM vijaya."AdminUser" WHERE "role" = 'SUPER_ADMIN' AND "disabled" = false`,
      );
      if (Number(count?.count ?? 0) <= 1) return failure(409, "LAST_ADMIN", "The last active Super Admin cannot be removed.");
    }
    const { rows: [after] } = await tx.query<Pick<AdminUser, "id" | "name" | "email" | "role" | "disabled" | "mustChangePassword" | "createdAt">>(
      `UPDATE vijaya."AdminUser"
       SET "role" = COALESCE($2,"role"), "disabled" = COALESCE($3,"disabled"),
           "passwordHash" = COALESCE($4,"passwordHash"),
           "mustChangePassword" = CASE WHEN $5 THEN true ELSE "mustChangePassword" END,
           "sessionVersion" = "sessionVersion" + 1, "updatedAt" = now()
       WHERE "id" = $1
       RETURNING "id","name","email","role","disabled","mustChangePassword","createdAt"`,
      [id, role ?? null, disabled ?? null, passwordHash ?? null, temporary !== undefined],
    );
    if (!after) throw new Error("Admin user update returned no row.");
    await tx.query(`DELETE FROM vijaya."AdminSession" WHERE "adminId" = $1`, [id]);
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
  const { rows } = await query<SlotState & { space: { name: string } }>(
    `SELECT s.*, json_build_object('name', p."name") AS space
     FROM vijaya."SlotState" s JOIN vijaya."Space" p ON p."id" = s."spaceId"
     WHERE s."date" BETWEEN $1 AND $2 AND ($3::text IS NULL OR s."spaceId" = $3) AND s."status" <> 'CANCELLED'
     ORDER BY s."date" ASC, s."spaceId" ASC, s."startMinute" ASC`,
    [from, to, venue ?? null],
  );
  return success(rows);
}

export async function dashboard() {
  await expireHolds();
  const now = new Date();
  const today = indiaDate(now);
  const end = (days: number) => indiaDate(new Date(now.getTime() + days * 86400000));
  const yearAgo = end(-365);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [bookingResult, monthlyResult, leadResult, expiringResult] = await Promise.all([
    query<Booking & { payments: Payment[] }>(
      `SELECT b.*,
         COALESCE((SELECT json_agg(p) FROM vijaya."Payment" p WHERE p."bookingId" = b."id"), '[]'::json) AS payments
       FROM vijaya."Booking" b WHERE b."eventDate" >= $1 OR b."status" = 'CONFIRMED' ORDER BY b."eventDate" ASC`,
      [yearAgo],
    ),
    query<Pick<Payment, "amount">>(
      `SELECT "amount" FROM vijaya."Payment" WHERE "status" = 'SUCCESS' AND "createdAt" >= $1`,
      [new Date(monthStart + "T00:00:00+05:30")],
    ),
    query<{ count: string }>(
      `SELECT count(*)::text AS count FROM vijaya."Lead" WHERE "stage" = ANY($1::text[])`,
      [["NEW", "New Lead"]],
    ),
    query<Pick<Booking, "reference" | "eventDate" | "spaceName" | "holdExpiresAt">>(
      `SELECT "reference","eventDate","spaceName","holdExpiresAt" FROM vijaya."Booking"
       WHERE "holdExpiresAt" > $1 AND "holdExpiresAt" <= $2 ORDER BY "holdExpiresAt" ASC LIMIT 10`,
      [now, new Date(now.getTime() + 15 * 60_000)],
    ),
  ]);
  const bookings = bookingResult.rows;
  const monthly = monthlyResult.rows;
  const newEnquiries = Number(leadResult.rows[0]?.count ?? 0);
  const expiring = expiringResult.rows;
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED");
  const pending = bookings.filter((b) => ["PENDING_HOLD", "PENDING_PAYMENT", "PENDING_APPROVAL"].includes(b.status));
  const group = (values: string[]) => Array.from(values.reduce((map, value) => map.set(value, (map.get(value) ?? 0) + 1), new Map<string, number>()), ([name, count]) => ({ name, count }));
  const history = bookings.filter((b) => b.eventDate >= yearAgo && ["CONFIRMED", "COMPLETED", "NO_SHOW"].includes(b.status));
  const revenue = new Map<string, number>();
  for (const b of bookings) for (const p of b.payments) if (p.status === "SUCCESS") {
    const month = indiaDate(p.paidAt ?? p.createdAt).slice(0, 7);
    revenue.set(month, (revenue.get(month) ?? 0) + Number(p.amount));
  }
  const list = (rows: typeof bookings) => rows.slice(0, 10).map(({ reference, eventDate, spaceName, status }) => ({ reference, eventDate, spaceName, status }));
  return success({
    kpis: {
      "Today's events": confirmed.filter((b) => b.eventDate === today).length,
      "Next 7 days": confirmed.filter((b) => b.eventDate >= today && b.eventDate < end(7)).length,
      "Next 30 days": confirmed.filter((b) => b.eventDate >= today && b.eventDate < end(30)).length,
      "Pending approvals": pending.length, "New enquiries": newEnquiries,
      "Monthly revenue": monthly.reduce((sum, p) => sum + Number(p.amount), 0),
      "Outstanding balance": confirmed.reduce((sum, b) => sum + Math.max(0, totalContract(b) - b.payments.reduce((paid, p) => paid + (p.status === "SUCCESS" ? Number(p.amount) : 0), 0)), 0),
    },
    charts: { "Bookings per month": group(history.map((b) => b.eventDate.slice(0, 7))), "Revenue trend": Array.from(revenue, ([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)).slice(-12), "Venue activity": group(history.map((b) => b.spaceName)), "Event types": group(history.map((b) => b.eventType)) },
    next: list(confirmed.filter((b) => b.eventDate >= today)), pending: list(pending), expiring,
  });
}

export async function auditLog(req: Request) {
  const params = new URL(req.url).searchParams;
  const entity = params.get("entity")?.slice(0, 100) || null;
  const action = params.get("action")?.slice(0, 100) || null;
  const limit = params.get("export") === "json" ? 5000 : 200;
  const { rows } = await query<AuditLog>(
    `SELECT * FROM vijaya."AuditLog"
     WHERE ($1::text IS NULL OR "entity" = $1) AND ($2::text IS NULL OR "action" = $2)
     ORDER BY "createdAt" DESC LIMIT $3`,
    [entity, action, limit],
  );
  if (params.get("export") === "json") return new Response(JSON.stringify(rows), { headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="vijaya-audit.json"', "Cache-Control": "no-store" } });
  return success(rows);
}
