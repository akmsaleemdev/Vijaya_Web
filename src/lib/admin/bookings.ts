import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query } from "@/lib/db";
import type { AuditLog, Booking, BookingNote, Document, Milestone, Payment, Space, SlotState } from "@/lib/db/types";
import { sumMoney, totalContract, type Money } from "@/lib/booking/amounts";
import { confirmIn, createTemporaryHold } from "@/lib/availability";
import { dates, holdInput, indiaDate } from "@/lib/booking/slots";
import { cancelIn, expireIn, pendingStatuses, isSlotConflict, physicalSpaces, reserve, slotRange } from "@/lib/booking/state";
import { bookingTransaction } from "@/lib/booking/transaction";
import { spreadsheet } from "./spreadsheet";
import { audit, failure, success, type Identity } from "./http";

const filter = z.object({
  q: z.string().max(120).optional(),
  status: z.enum(["PENDING_HOLD","PENDING_APPROVAL","PENDING_PAYMENT","CONFIRMED","CANCELLED","REJECTED","EXPIRED","COMPLETED","NO_SHOW"]).optional(),
  venue: z.string().max(100).optional(),
  from: dates.optional(), to: dates.optional(), source: z.enum(["ADMIN", "WEB"]).optional(),
  payment: z.enum(["PAID", "OUTSTANDING"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  sort: z.enum(["eventDate", "createdAt", "customerName", "status"]).default("eventDate"),
  order: z.enum(["asc", "desc"]).default("desc"),
  export: z.enum(["csv", "xlsx"]).optional(),
});
export const paid = (payments: { status: string; amount: Money }[]) =>
  sumMoney(payments.filter((payment) => payment.status === "SUCCESS").map(({ amount }) => amount));
export const contract = totalContract;

function csvField(value: unknown) {
  const text = String(value ?? "");
  return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" : "") + text.replaceAll('"', '""') + '"';
}

export async function bookings(req: Request, actor: Identity, reference?: string) {
  if (reference) {
    const { rows: [booking] } = await query<Booking & { payments: Payment[]; documents: Document[]; milestones: Milestone[] }>(
      `SELECT b.*,
         COALESCE((SELECT json_agg(p ORDER BY p."createdAt" DESC) FROM vijaya."Payment" p WHERE p."bookingId" = b."id"), '[]'::json) AS payments,
         COALESCE((SELECT json_agg(d ORDER BY d."createdAt" DESC) FROM vijaya."Document" d WHERE d."bookingId" = b."id"), '[]'::json) AS documents,
         COALESCE((SELECT json_agg(m ORDER BY m."order" ASC) FROM vijaya."Milestone" m WHERE m."bookingId" = b."id"), '[]'::json) AS milestones
       FROM vijaya."Booking" b WHERE b."reference" = $1`,
      [reference],
    );
    if (!booking) return failure(404, "NOT_FOUND", "Booking not found.");
    const [history, notes] = await Promise.all([
      query<AuditLog>(`SELECT * FROM vijaya."AuditLog" WHERE "entity" = 'Booking' AND "entityRef" = $1 ORDER BY "createdAt" DESC`, [reference]),
      query<BookingNote>(`SELECT * FROM vijaya."BookingNote" WHERE "bookingRef" = $1 ORDER BY "createdAt" DESC`, [reference]),
    ]);
    return success({ ...booking, baseAmount: Number(booking.baseAmount), weekendUplift: Number(booking.weekendUplift), taxAmount: Number(booking.taxAmount),
      totalPayable: Number(booking.totalPayable), addons: booking.addons ? JSON.stringify(booking.addons) : null,
      payments: booking.payments.map((item) => ({ ...item, amount: Number(item.amount) })), history: history.rows, notesLog: notes.rows, balance: contract(booking) - paid(booking.payments) });
  }
  const parsed = filter.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return failure(422, "INVALID_FILTER", "Check your booking filters.");
  const { q, venue, from, to, status, source, payment, page, sort, order, export: format } = parsed.data;
  if (format && actor.admin.role !== "SUPER_ADMIN") return failure(403, "FORBIDDEN", "An administrator must export bookings.");
  const conditions = ["TRUE"];
  const values: unknown[] = [];
  const add = (condition: (parameter: string) => string, value: unknown) => {
    values.push(value);
    conditions.push(condition("$" + values.length));
  };
  if (status) add((p) => `b."status" = ${p}`, status);
  if (venue) add((p) => `b."spaceId" = ${p}`, venue);
  if (source) add((p) => `b."source" = ${p}`, source);
  if (from) add((p) => `b."eventDate" >= ${p}`, from);
  if (to) add((p) => `b."eventDate" <= ${p}`, to);
  if (q) add((p) => `(strpos(b."reference",${p}) > 0 OR strpos(b."customerName",${p}) > 0 OR strpos(b."customerPhone",${p}) > 0 OR strpos(b."customerEmail",${p}) > 0)`, q);
  if (payment) {
    const paidExpr = `COALESCE((SELECT sum(p."amount") FROM vijaya."Payment" p WHERE p."bookingId" = b."id" AND p."status" = 'SUCCESS'), 0)`;
    const contractExpr = `(b."baseAmount" + b."weekendUplift" + b."taxAmount")`;
    conditions.push(payment === "PAID" ? `${paidExpr} >= ${contractExpr}` : `${paidExpr} < ${contractExpr}`);
  }
  const whereSql = conditions.join(" AND ");
  const sortColumn = { eventDate: "eventDate", createdAt: "createdAt", customerName: "customerName", status: "status" }[sort];
  const direction = order === "asc" ? "ASC" : "DESC";
  const limit = format ? 10000 : 25;
  const offset = format ? 0 : (page - 1) * 25;
  const listValues = [...values, limit, offset];
  const [listResult, countResult] = await Promise.all([
    query<Booking & { payments: Payment[] }>(
      `SELECT b.*,
         COALESCE((SELECT json_agg(p ORDER BY p."createdAt" DESC) FROM vijaya."Payment" p WHERE p."bookingId" = b."id"), '[]'::json) AS payments
       FROM vijaya."Booking" b WHERE ${whereSql}
       ORDER BY b."${sortColumn}" ${direction}, b."id" ASC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      listValues,
    ),
    query<{ count: string }>(`SELECT count(*)::text AS count FROM vijaya."Booking" b WHERE ${whereSql}`, values),
  ]);
  const rows = listResult.rows;
  const total = Number(countResult.rows[0]?.count ?? 0);
  if (format) {
    if (total > rows.length) return failure(422, "EXPORT_TOO_LARGE", "Narrow the date range before exporting.");
    const fields = ["reference", "customerName", "customerEmail", "customerPhone", "status", "spaceName", "eventDate", "slot", "guests", "source"] as const;
    if (format === "xlsx") return new Response(spreadsheet([[...fields], ...rows.map((row) => fields.map((field) => row[field]))]), {
      headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="vijaya-bookings.xlsx"', "Cache-Control": "no-store" },
    });
    const csv = [fields.join(","), ...rows.map((row) => fields.map((field) => csvField(row[field])).join(","))].join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="vijaya-bookings.csv"', "Cache-Control": "no-store" } });
  }
  return success({ rows, total, page, limit: 25 });
}

const reason = z.string().trim().min(1).max(2000);
const actionInput = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["CONFIRM", "COMPLETE", "NO_SHOW"]) }),
  z.object({ action: z.enum(["CANCEL", "REJECT"]), reason }),
  z.object({ action: z.literal("RESCHEDULE"), date: dates, slot: z.string().min(1).max(40), venue: z.string().min(1).max(100) }),
  z.object({ action: z.literal("NOTE"), note: reason }),
  z.object({ action: z.literal("PAYMENT"), amount: z.coerce.number().int().positive().max(100000000), method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "UPI", "OTHER"]), key: z.string().uuid() }),
]);

export async function createBooking(req: Request, actor: Identity) {
  const parsed = holdInput.extend({ slot: z.string().regex(/^[A-Z][A-Z0-9_]{0,39}$/) }).safeParse(await req.json().catch(() => null));
  const key = req.headers.get("idempotency-key") ?? undefined;
  if (!parsed.success || !parsed.data.customer?.name || !parsed.data.customer?.email || !parsed.data.customer?.phone || (key && key.length > 128)) {
    return failure(422, "INVALID_BOOKING", "Complete the booking and customer details.");
  }
  const result = await createTemporaryHold(parsed.data, { key, actorId: actor.admin.id, ip: actor.ip, confirm: true });
  return result.ok ? success(result, 201) : failure(["SLOT_UNAVAILABLE", "IDEMPOTENCY_CONFLICT"].includes(result.code) ? 409 : 422, result.code, result.message);
}

export async function updateBooking(req: Request, actor: Identity, reference: string) {
  const parsed = actionInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failure(422, "INVALID_ACTION", "Check the action and its details.");
  const action = parsed.data;
  try {
    return await bookingTransaction(async (tx) => {
      await expireIn(tx);
      const { rows: [booking] } = await tx.query<Booking & { payments: Payment[] }>(
        `SELECT b.*,
           COALESCE((SELECT json_agg(p) FROM vijaya."Payment" p WHERE p."bookingId" = b."id"), '[]'::json) AS payments
         FROM vijaya."Booking" b WHERE b."reference" = $1`,
        [reference],
      );
      if (!booking) return failure(404, "NOT_FOUND", "Booking not found.");
      const conflict = () => failure(409, "INVALID_STATUS", "The booking cannot transition from its current status.");
      switch (action.action) {
        case "CONFIRM":
          if (!await confirmIn(tx, reference, { actorId: actor.admin.id, ip: actor.ip })) return conflict();
          break;
        case "CANCEL":
        case "REJECT":
          if (!pendingStatuses.includes(booking.status) && !(action.action === "CANCEL" && booking.status === "CONFIRMED")) return conflict();
          await cancelIn(tx, booking, action.action === "CANCEL" ? "CANCELLED" : "REJECTED", action.reason, actor.admin.id, actor.ip);
          break;
        case "COMPLETE":
        case "NO_SHOW": {
          if (booking.status !== "CONFIRMED" || booking.eventDate > indiaDate()) return conflict();
          const status = action.action === "COMPLETE" ? "COMPLETED" : "NO_SHOW";
          await tx.query(`UPDATE vijaya."Booking" SET "status" = $2::vijaya."BookingStatus", "updatedAt" = now() WHERE "reference" = $1`, [reference, status]);
          await audit(tx, actor, status, "Booking", reference, { status: booking.status }, { status });
          break;
        }
        case "RESCHEDULE": {
          if (booking.status !== "PENDING_HOLD" && booking.status !== "PENDING_APPROVAL" && booking.status !== "PENDING_PAYMENT" && booking.status !== "CONFIRMED") return conflict();
          const { rows: [space] } = await tx.query<Space>(`SELECT * FROM vijaya."Space" WHERE "id" = $1`, [action.venue]);
          const range = space?.active && await slotRange(tx, action.venue, action.slot);
          if (!space || !range || action.date < indiaDate() || (space.capacityMin ?? 0) > booking.guests || (space.capacityMax ?? Infinity) < booking.guests) {
            return failure(422, "INVALID_SESSION", "Choose an active venue and session that can accommodate this booking.");
          }
          await tx.query(`DELETE FROM vijaya."SlotState" WHERE "bookingRef" = $1 AND "source" = ANY($2::text[])`, [reference, ["ONLINE", "OPS"]]);
          const status = booking.status === "PENDING_HOLD" ? "TEMPORARY_HOLD" : booking.status;
          const times = await reserve(tx, { spaceSlug: space.id, date: action.date, slot: action.slot, range, status, source: "OPS", bookingRef: reference, holdExpiresAt: booking.holdExpiresAt ?? undefined });
          await tx.query(
            `UPDATE vijaya."Booking"
             SET "spaceId" = $2, "spaceName" = $3, "eventDate" = $4, "slot" = $5,
                 "childSpaceIds" = $6, "startAt" = $7, "endAt" = $8, "updatedAt" = now()
             WHERE "reference" = $1`,
            [reference, space.id, space.name, action.date, action.slot, times.childSpaceIds, times.startAt, times.endAt],
          );
          const { rows: milestones } = await tx.query<Milestone>(`SELECT * FROM vijaya."Milestone" WHERE "bookingId" = $1`, [booking.id]);
          for (const milestone of milestones) {
            const dueDate = new Date(Date.parse(action.date + "T00:00:00Z") - milestone.order * 86400000).toISOString().slice(0, 10);
            await tx.query(`UPDATE vijaya."Milestone" SET "dueDate" = $2 WHERE "id" = $1`, [milestone.id, dueDate]);
          }
          await audit(tx, actor, "RESCHEDULED", "Booking", reference, { date: booking.eventDate, venue: booking.spaceId, slot: booking.slot }, action);
          break;
        }
        case "NOTE":
          await tx.query(
            `INSERT INTO vijaya."BookingNote" ("id","bookingRef","note","actorId","createdAt") VALUES ($1,$2,$3,$4,now())`,
            [randomUUID(), reference, action.note, actor.admin.id],
          );
          await audit(tx, actor, "NOTE_ADDED", "Booking", reference, undefined, { note: action.note });
          break;
        case "PAYMENT": {
          if (!["CONFIRMED", "COMPLETED", "PENDING_PAYMENT"].includes(booking.status)) return conflict();
          const idempotencyKey = `offline:${booking.id}:${action.key}`;
          const { rows: [existing] } = await tx.query<Payment>(`SELECT * FROM vijaya."Payment" WHERE "idempotencyKey" = $1`, [idempotencyKey]);
          if (existing) return Number(existing.amount) === action.amount && existing.method === action.method ? success({ reference }) : failure(409, "IDEMPOTENCY_CONFLICT", "Use a new request key for a different payment.");
          if (action.amount > contract(booking) - paid(booking.payments)) return failure(422, "INVALID_AMOUNT", "The payment exceeds the balance.");
          const providerRef = randomUUID();
          const { rows: [payment] } = await tx.query<Payment>(
            `INSERT INTO vijaya."Payment"
              ("id","bookingId","amount","method","status","provider","providerRef","idempotencyKey","paidAt","createdAt","updatedAt")
             VALUES ($1,$2,$3,$4,'SUCCESS','OFFLINE',$5,$6,now(),now(),now()) RETURNING *`,
            [randomUUID(), booking.id, action.amount, action.method, providerRef, idempotencyKey],
          );
          if (!payment) throw new Error("Payment record insert returned no row.");
          await tx.query(
            `INSERT INTO vijaya."Document" ("id","bookingId","type","title","createdAt") VALUES ($1,$2,'RECEIPT',$3,now())`,
            [randomUUID(), booking.id, `Payment Receipt — ${payment.providerRef}`],
          );
          await audit(tx, actor, "PAYMENT_RECORDED", "Booking", reference, undefined, { paymentId: payment.id, amount: payment.amount });
          break;
        }
      }
      return success({ reference });
    });
  } catch (error) {
    if (!isSlotConflict(error)) throw error;
    return failure(409, "SLOT_UNAVAILABLE", "The selected session overlaps another reservation.");
  }
}

const blockInput = z.object({ from: dates, to: dates, venue: z.string().min(1).max(100), slot: z.string().min(1).max(40), reason });
export async function blockDates(req: Request, actor: Identity, groupId?: string) {
  if (req.method === "DELETE" && groupId) {
    return bookingTransaction(async (tx) => {
      const { rows } = await tx.query<SlotState>(
        `SELECT * FROM vijaya."SlotState" WHERE "groupId" = $1 AND "status" = 'BLOCKED' AND "source" = 'OPS'`,
        [groupId],
      );
      if (!rows.length) return failure(404, "NOT_FOUND", "Block not found.");
      await tx.query(`DELETE FROM vijaya."SlotState" WHERE "groupId" = $1 AND "status" = 'BLOCKED' AND "source" = 'OPS'`, [groupId]);
      await audit(tx, actor, "BLOCK_REMOVED", "SlotState", groupId, rows);
      return success({ groupId });
    });
  }
  const parsed = blockInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.from > parsed.data.to || Date.parse(parsed.data.to) - Date.parse(parsed.data.from) > 30 * 86400000 || parsed.data.from < indiaDate()) {
    return failure(422, "INVALID_BLOCK", "Choose a current or future range of up to 31 days and enter a reason.");
  }
  const input = parsed.data;
  const id = randomUUID();
  try {
    return await bookingTransaction(async (tx) => {
      await expireIn(tx);
      const { rows: spaces } = await tx.query<Space>(
        `SELECT * FROM vijaya."Space" WHERE "active" = true AND ($1::text IS NULL OR "id" = $1)`,
        [input.venue === "ALL" ? null : input.venue],
      );
      const physical = input.venue === "ALL" ? spaces.filter((space) => physicalSpaces(space.id).includes(space.id)) : spaces;
      const planned = await Promise.all(physical.map(async (space) => ({ id: space.id, range: await slotRange(tx, space.id, input.slot) })));
      if (!planned.length || planned.some((space) => !space.range)) return failure(422, "UNKNOWN_SESSION", "The selected session is unavailable for one or more venues.");
      for (let stamp = Date.parse(input.from); stamp <= Date.parse(input.to); stamp += 86400000) {
        const date = new Date(stamp).toISOString().slice(0, 10);
        for (const space of planned) {
          if (space.range) await reserve(tx, { spaceSlug: space.id, date, slot: input.slot, range: space.range, status: "BLOCKED", source: "OPS", note: input.reason, groupId: id });
        }
      }
      await audit(tx, actor, "DATES_BLOCKED", "SlotState", id, undefined, input);
      return success({ groupId: id }, 201);
    });
  } catch (error) {
    if (!isSlotConflict(error)) throw error;
    return failure(409, "SLOT_UNAVAILABLE", "One or more sessions overlap an existing reservation. No dates were blocked.");
  }
}
