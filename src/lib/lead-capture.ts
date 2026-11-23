import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

    const lead = await db.lead.create({
      data: {
        type,
        stage: "New Lead",
        name: String(name).slice(0, 120),
        phone: String(phone).slice(0, 32),
        email: String(email).toLowerCase().slice(0, 160),
        country: country ? String(country).slice(0, 60) : null,
        eventType: body.eventType ? String(body.eventType).slice(0, 20) : null,
        eventDate: body.eventDate ? String(body.eventDate).slice(0, 10) : null,
        slot: body.slot ? String(body.slot).slice(0, 12) : null,
        guests: body.guests ? Number(body.guests) || null : null,
        venueInterest: body.venueInterest ? String(body.venueInterest).slice(0, 40) : null,
        setting: body.setting ? String(body.setting).slice(0, 10) : null,
        visitDate: body.visitDate ? String(body.visitDate).slice(0, 10) : null,
        visitTime: body.visitTime ? String(body.visitTime).slice(0, 40) : null,
        message: body.message ? String(body.message).slice(0, 2000) : null,
        source: body.source ? String(body.source).slice(0, 40) : "website",
        utmJson: Object.keys(utm).length ? JSON.stringify(utm) : null,
      },
    });

    // Internal notification hook (email/WhatsApp/CRM when integrations are approved).
    await db.auditLog.create({
      data: { action: "LEAD_CREATED", entity: "Lead", entityRef: lead.id, detailJson: JSON.stringify({ type, source: lead.source }) },
    });

    return NextResponse.json({ ok: true, leadId: lead.id });
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
