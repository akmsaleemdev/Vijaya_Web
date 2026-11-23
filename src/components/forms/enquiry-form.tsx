"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Send, CheckCircle2, Phone } from "lucide-react";
import { EVENT_CATEGORIES, SLOTS, SITE, type EventCategory, type SlotId } from "@/lib/site-config";
import { SPACES } from "@/lib/data/spaces";
import { track } from "@/lib/analytics";

type Variant = "PLAN_EVENT" | "VENUE_VISIT" | "CONTACT" | "GLOBAL_DESK";

const inputCls = "input-vij";
const errCls = "mt-1.5 text-[12px] text-destructive";

export function EnquiryForm({ variant }: { variant: Variant }) {
  const params = useSearchParams();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverMsg, setServerMsg] = useState<string | null>(null);

  const [f, setF] = useState({
    eventType: (params.get("eventType") as EventCategory) || "WEDDING",
    eventDate: "",
    slot: "EVENING" as SlotId,
    guests: "",
    setting: "EITHER",
    venueInterest: params.get("venue") || "",
    name: "",
    phone: "",
    email: "",
    country: "India",
    visitDate: "",
    visitTime: "Morning (10:00 – 13:00)",
    message: "",
    subject: "General enquiry",
  });

  useEffect(() => {
    const v = params.get("venue");
    const et = params.get("eventType");
    if (v || et) setF((p) => ({ ...p, venueInterest: v || p.venueInterest, eventType: (et as EventCategory) || p.eventType }));
  }, [params]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Please share your name.";
    if (!/^[+\d][\d\s\-()]{6,}$/.test(f.phone.trim())) e.phone = "Please enter a valid phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Please enter a valid email address.";
    if (variant === "PLAN_EVENT" && !f.eventDate) e.eventDate = "Choose your preferred event date.";
    if (variant === "VENUE_VISIT" && !f.visitDate) e.visitDate = "Choose your preferred visit date.";
    if (variant === "CONTACT" && f.message.trim().length < 10) e.message = "Tell us a little more so we can help.";
    if (variant === "GLOBAL_DESK" && f.message.trim().length < 10) e.message = "Tell us a little more so we can help.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setState("sending");
    setServerMsg(null);
    const endpoint =
      variant === "PLAN_EVENT" ? "/api/leads/plan-event"
      : variant === "VENUE_VISIT" ? "/api/leads/venue-visit"
      : variant === "GLOBAL_DESK" ? "/api/leads/global-desk"
      : "/api/leads/contact";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Something went wrong.");
      if (variant === "PLAN_EVENT") track("plan_event_submitted", { eventType: f.eventType });
      if (variant === "VENUE_VISIT") track("venue_visit_submitted", { eventType: f.eventType });
      if (variant === "GLOBAL_DESK") track("global_desk_enquiry", {});
      setState("done");
    } catch (err) {
      setState("error");
      setServerMsg(err instanceof Error ? err.message : "We couldn't send your enquiry. Please try again.");
    }
  };

  if (state === "done") {
    return (
      <div className="card-editorial p-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-available mx-auto" aria-hidden />
        <h3 className="mt-5 text-xl font-normal">Thank you — we've received your enquiry.</h3>
        <p className="mt-3 text-[14px] font-light leading-7 text-stone max-w-md mx-auto">
          {variant === "VENUE_VISIT"
            ? "The VIJAYA events team will confirm your visit slot shortly. We look forward to welcoming you."
            : variant === "GLOBAL_DESK"
            ? "The Global Desk will reach out within one working day to schedule your virtual consultation."
            : "The VIJAYA events team will respond within one working day."}
        </p>
        <p className="mt-6 text-[13px] text-stone">
          Urgent? Call us at{" "}
          <a href={SITE.contact.phoneHref} onClick={() => track("phone_clicked", { source: variant.toLowerCase() })} className="text-burgundy font-medium link-underline">
            {SITE.contact.phone}
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="card-editorial p-6 md:p-10">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="label-vij" htmlFor="ef-name">Full Name *</label>
          <input id="ef-name" className={inputCls} value={f.name} onChange={set("name")} autoComplete="name" placeholder="Your name" aria-invalid={!!errors.name} />
          {errors.name && <p className={errCls} role="alert">{errors.name}</p>}
        </div>
        <div>
          <label className="label-vij" htmlFor="ef-phone">Phone *</label>
          <input id="ef-phone" className={inputCls} value={f.phone} onChange={set("phone")} autoComplete="tel" placeholder="+91 …" aria-invalid={!!errors.phone} />
          {errors.phone && <p className={errCls} role="alert">{errors.phone}</p>}
        </div>
        <div>
          <label className="label-vij" htmlFor="ef-email">Email *</label>
          <input id="ef-email" type="email" className={inputCls} value={f.email} onChange={set("email")} autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} />
          {errors.email && <p className={errCls} role="alert">{errors.email}</p>}
        </div>
        <div>
          <label className="label-vij" htmlFor="ef-country">Country</label>
          <select id="ef-country" className={inputCls} value={f.country} onChange={set("country")}>
            {["India", "United Arab Emirates", "Qatar", "Oman", "Saudi Arabia", "Kuwait", "Bahrain", "United Kingdom", "United States", "Singapore", "Other"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {(variant === "PLAN_EVENT" || variant === "VENUE_VISIT" || variant === "GLOBAL_DESK") && (
          <div>
            <label className="label-vij" htmlFor="ef-type">Event Type</label>
            <select id="ef-type" className={inputCls} value={f.eventType} onChange={set("eventType")}>
              {EVENT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        )}

        {variant === "PLAN_EVENT" && (
          <>
            <div>
              <label className="label-vij" htmlFor="ef-date">Preferred Date *</label>
              <input id="ef-date" type="date" className={inputCls} min={new Date().toISOString().slice(0, 10)} value={f.eventDate} onChange={set("eventDate")} aria-invalid={!!errors.eventDate} />
              {errors.eventDate && <p className={errCls} role="alert">{errors.eventDate}</p>}
            </div>
            <div>
              <label className="label-vij" htmlFor="ef-slot">Preferred Slot</label>
              <select id="ef-slot" className={inputCls} value={f.slot} onChange={set("slot")}>
                {SLOTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label} — {s.time}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-vij" htmlFor="ef-guests">Expected Guests</label>
              <input id="ef-guests" type="number" min={10} className={inputCls} value={f.guests} onChange={set("guests")} placeholder="e.g. 300" />
            </div>
            <div>
              <label className="label-vij" htmlFor="ef-setting">Indoor / Outdoor</label>
              <select id="ef-setting" className={inputCls} value={f.setting} onChange={set("setting")}>
                <option value="EITHER">Either</option>
                <option value="INDOOR">Indoor</option>
                <option value="OUTDOOR">Outdoor</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label-vij" htmlFor="ef-venue">Preferred Venue</label>
              <select id="ef-venue" className={inputCls} value={f.venueInterest} onChange={set("venueInterest")}>
                <option value="">No preference — advise me</option>
                {SPACES.filter((s) => s.bookableOnline).map((s) => (
                  <option key={s.slug} value={s.slug}>{s.officialName}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {variant === "VENUE_VISIT" && (
          <>
            <div>
              <label className="label-vij" htmlFor="ef-visit-date">Preferred Visit Date *</label>
              <input id="ef-visit-date" type="date" className={inputCls} min={new Date().toISOString().slice(0, 10)} value={f.visitDate} onChange={set("visitDate")} aria-invalid={!!errors.visitDate} />
              {errors.visitDate && <p className={errCls} role="alert">{errors.visitDate}</p>}
            </div>
            <div>
              <label className="label-vij" htmlFor="ef-visit-time">Preferred Visit Time</label>
              <select id="ef-visit-time" className={inputCls} value={f.visitTime} onChange={set("visitTime")}>
                <option>Morning (10:00 – 13:00)</option>
                <option>Afternoon (14:00 – 17:00)</option>
              </select>
            </div>
            <div>
              <label className="label-vij" htmlFor="ef-edate">Event Date</label>
              <input id="ef-edate" type="date" className={inputCls} min={new Date().toISOString().slice(0, 10)} value={f.eventDate} onChange={set("eventDate")} />
            </div>
            <div>
              <label className="label-vij" htmlFor="ef-guests">Expected Guests</label>
              <input id="ef-guests" type="number" min={10} className={inputCls} value={f.guests} onChange={set("guests")} placeholder="e.g. 300" />
            </div>
          </>
        )}

        {(variant === "CONTACT") && (
          <div>
            <label className="label-vij" htmlFor="ef-subject">Subject</label>
            <select id="ef-subject" className={inputCls} value={f.subject} onChange={set("subject")}>
              <option>General enquiry</option>
              <option>Weddings</option>
              <option>Business & MICE</option>
              <option>Celebrations</option>
              <option>Booking support</option>
              <option>My VIJAYA portal support</option>
            </select>
          </div>
        )}

        {(variant === "CONTACT" || variant === "PLAN_EVENT" || variant === "GLOBAL_DESK") && (
          <div className={variant === "CONTACT" ? "sm:col-span-2" : "sm:col-span-2"}>
            <label className="label-vij" htmlFor="ef-msg">
              {variant === "CONTACT" ? "Message *" : "Requirements"}
            </label>
            <textarea id="ef-msg" rows={4} className={`${inputCls} !min-h-[120px] py-3 resize-y`} value={f.message} onChange={set("message")} placeholder={variant === "CONTACT" ? "How can we help?" : "Traditions, themes, guest mix, vendors — anything that shapes the plan."} aria-invalid={!!errors.message} />
            {errors.message && <p className={errCls} role="alert">{errors.message}</p>}
          </div>
        )}
      </div>

      {serverMsg && <p role="alert" className="mt-5 text-[13px] text-destructive">{serverMsg}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <button type="submit" disabled={state === "sending"} className="btn-primary disabled:opacity-60">
          {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span>
            {variant === "PLAN_EVENT" ? "Submit Event Enquiry"
            : variant === "VENUE_VISIT" ? "Request Venue Visit"
            : variant === "GLOBAL_DESK" ? "Schedule Virtual Consultation"
            : "Send Message"}
          </span>
        </button>
        <p className="text-[12px] text-stone flex items-center gap-2">
          <Phone className="h-3.5 w-3.5" /> or call {SITE.contact.phone}
        </p>
      </div>
      <p className="mt-5 text-[11px] leading-5 text-stone/70">
        Your enquiry creates a lead in the VIJAYA CRM with source and campaign information, so the right team member
        responds with context. See our <a href="/privacy" className="link-underline">privacy notice</a>.
      </p>
    </form>
  );
}
