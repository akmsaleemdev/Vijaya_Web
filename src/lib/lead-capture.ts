import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Shared lead-capture handler for all public forms. */
async function captureLead(
  req: Request,
  type: "PLAN_EVENT" | "VENUE_VISIT" | "CONTACT" | "GLOBAL_DESK"
) {
  try {
    const body = await req.json();
    const { name, phone, email, country } = body || {};
    if (!name || !phone || !email) {
      return NextResponse.json({ error: "Name, phone and email are required." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    const utm: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      if (body?.[k]) utm[k] = String(body[k]).slice(0, 120);
    }

    const id = randomUUID();
    const source = body.source ? String(body.source).slice(0, 40) : "website";
    await query(
      `INSERT INTO vijaya."Lead"
        ("id", "type", "stage", "name", "phone", "email", "country", "eventType", "eventDate", "slot", "guests",
         "venueInterest", "setting", "visitDate", "visitTime", "message", "source", "utmJson", "createdAt")
       VALUES ($1,$2,'New Lead',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now())`,
      [
        id, type, String(name).slice(0, 120), String(phone).slice(0, 32), String(email).toLowerCase().slice(0, 160),
        country ? String(country).slice(0, 60) : null,
        body.eventType ? String(body.eventType).slice(0, 20) : null,
        body.eventDate ? String(body.eventDate).slice(0, 10) : null,
        body.slot ? String(body.slot).slice(0, 12) : null,
        body.guests ? Number(body.guests) || null : null,
        body.venueInterest ? String(body.venueInterest).slice(0, 40) : null,
        body.setting ? String(body.setting).slice(0, 10) : null,
        body.visitDate ? String(body.visitDate).slice(0, 10) : null,
        body.visitTime ? String(body.visitTime).slice(0, 40) : null,
        body.message ? String(body.message).slice(0, 2000) : null,
        source, Object.keys(utm).length ? JSON.stringify(utm) : null,
      ],
    );

    // Internal notification hook (email/WhatsApp/CRM when integrations are approved).
    await query(
      `INSERT INTO vijaya."AuditLog" ("id", "action", "entity", "entityRef", "detailJson", "createdAt")
       VALUES ($1, 'LEAD_CREATED', 'Lead', $2, $3, now())`,
      [randomUUID(), id, JSON.stringify({ type, source })],
    );

    return NextResponse.json({ ok: true, leadId: id });
  } catch (e) {
    console.error(`lead/${type} error`, e);
    return NextResponse.json({ error: "We couldn't send your enquiry. Please try again." }, { status: 500 });
  }
}

export function planEvent(req: Request) {
  return captureLead(req, "PLAN_EVENT");
}
export function venueVisit(req: Request) {
  return captureLead(req, "VENUE_VISIT");
}
export function contact(req: Request) {
  return captureLead(req, "CONTACT");
}
export function globalDesk(req: Request) {
  return captureLead(req, "GLOBAL_DESK");
}
