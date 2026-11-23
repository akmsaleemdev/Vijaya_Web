import nodemailer from "nodemailer";
import { z } from "zod";
import { db } from "@/lib/db";
import { bookingTransaction } from "@/lib/booking/transaction";
import { audit, failure, success, type Identity } from "./http";
import { schemaFor } from "./content-schema";

export async function payments(req: Request, actor: Identity, id?: string) {
  if (req.method === "GET") return success(await db.payment.findMany({ orderBy: { createdAt: "desc" }, take: 250, include: { booking: { select: { reference: true, spaceName: true } } } }));
  const parsed = z.object({ reason: z.string().trim().min(1).max(1000) }).safeParse(await req.json().catch(() => null));
  if (!id || !parsed.success) return failure(422, "INVALID_REFUND", "Enter the refund reference and reason.");
  return bookingTransaction(async (tx) => {
    const before = await tx.payment.findUnique({ where: { id } });
    if (!before) return failure(404, "NOT_FOUND", "Payment not found.");
    if (before.status !== "SUCCESS" || !["OFFLINE", "SANDBOX"].includes(before.provider)) return failure(409, "INVALID_PAYMENT", "Only successful offline and sandbox payments can be marked refunded.");
    const after = await tx.payment.update({ where: { id }, data: { status: "REFUNDED" } });
    await audit(tx, actor, "REFUND_RECORDED", "Payment", id, before, { status: "REFUNDED", reason: parsed.data.reason });
    return success(after);
  });
}

const templates = {
  received: { subject: "VIJAYA received your booking request", body: "Hello {{name}}, we received booking {{reference}} for {{date}}." },
  confirmed: { subject: "Your VIJAYA booking is confirmed", body: "Hello {{name}}, your booking {{reference}} at {{venue}} on {{date}} is confirmed." },
  reminder: { subject: "Your upcoming VIJAYA event", body: "Hello {{name}}, your event at {{venue}} is scheduled for {{date}}." },
  cancelled: { subject: "Your VIJAYA booking was cancelled", body: "Hello {{name}}, booking {{reference}} has been cancelled." },
  receipt: { subject: "Your VIJAYA payment receipt", body: "Hello {{name}}, we recorded a payment for {{reference}}." },
};

export async function notifications(req: Request, actor: Identity) {
  if (req.method === "GET") return success(await db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 250 }));
  const parsed = z.object({ reference: z.string().min(1).max(80), template: z.enum(["received", "confirmed", "reminder", "cancelled", "receipt"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return failure(422, "INVALID_NOTIFICATION", "Choose a booking and email template.");
  const settings = { url: process.env.SMTP_URL, from: process.env.SMTP_FROM };
  if (!settings.url || !settings.from) return failure(409, "SMTP_NOT_CONFIGURED", "Configure the SMTP transport before sending email.");
  const { reference, template } = parsed.data;
  const booking = await db.booking.findUnique({ where: { reference } });
  if (!booking?.customerEmail) return failure(404, "NOT_FOUND", "No customer email was found for the booking.");
  const entry = await db.contentEntry.findUnique({ where: { key_locale: { key: "email.templates", locale: "en" } } });
  const checked = schemaFor("email.templates")?.safeParse(entry?.published ? JSON.parse(entry.published) : {});
  const overrides = checked?.success ? checked.data as Partial<typeof templates> : {};
  const text = overrides[template] ?? templates[template];
  const vars: Record<string, string> = { name: booking.customerName, date: booking.eventDate, venue: booking.spaceName, reference };
  const fill = (value: string) => value.replace(/{{(\w+)}}/g, (_, key: string) => vars[key] ?? "");
  const log = await db.emailLog.create({ data: { bookingRef: reference, template, status: "SENDING" } });
  let status = "SENT";
  try {
    await nodemailer.createTransport(settings.url).sendMail({ from: settings.from, to: booking.customerEmail, subject: fill(text.subject), text: fill(text.body) });
  } catch {
    status = "FAILED";
  }
  await bookingTransaction(async (tx) => {
    await tx.emailLog.update({ where: { id: log.id }, data: { status } });
    await audit(tx, actor, "EMAIL_" + status, "Booking", reference, undefined, { template, logId: log.id });
  });
  return status === "SENT" ? success({ status }) : failure(502, "EMAIL_FAILED", "SMTP delivery failed. Check the mail configuration.");
}
