"use client";
import { useCmsCopy } from "@/lib/cms/client";


/**
 * Checkout flow — steps 7–9 of the booking journey.
 * 7: Your Details → 8: Payment (gateway handoff) → 9: Confirmed.
 * Server-side rules: the hold is revalidated, payment verified via webhook,
 * confirmation never comes from the browser.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock, CreditCard, Loader2, Lock,
  Phone, Printer, ShieldCheck, TimerReset,
} from "lucide-react";
import { SLOTS, SITE } from "@/lib/site-config";
import { inr } from "@/lib/pricing";
import { track } from "@/lib/analytics";

interface BookingInfo {
  reference: string;
  bookingMode: "OFFLINE" | "SANDBOX";
  spaceName: string;
  eventType: string;
  eventDate: string;
  slot: string;
  guests: number;
  status: string;
  crmSync: string;
  holdExpiresAt: string | null;
  amounts: { base: number; weekendUplift: number; tax: number; deposit: number; totalPayable: number; totalContract: number };
  payments: { providerRef: string; amount: number; status: string; method: string | null; transactionId: string | null }[];
  customerFirstName: string | null;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function CheckoutFlow({ reference }: { reference: string }) {
  const cmsCopy = useCmsCopy("copy.components.checkout.checkout-flow");
  const router = useRouter();

  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"details" | "payment" | "requested" | "confirmed" | "expired" | "gone">("details");
  const [remaining, setRemaining] = useState<number>(0);

  const [f, setF] = useState({ name: "", phone: "", email: "", country: "India", notes: "", acceptTerms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState<{ message: string; detail?: string } | null>(null);
  const [payInitiating, setPayInitiating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/booking/${reference}`);
      if (res.status === 404) {
        setLoadError("We couldn't find this booking reference.");
        setPhase("gone");
        return;
      }
      const data: BookingInfo = await res.json();
      setInfo(data);
      if (data.status === "CONFIRMED") setPhase("confirmed");
      else if (data.status === "PENDING_APPROVAL") setPhase("requested");
      else if (["EXPIRED", "CANCELLED", "REJECTED"].includes(data.status)) setPhase("expired");
      else setPhase(data.status === "PENDING_PAYMENT" ? "payment" : "details");
    } catch {
      setLoadError("We couldn't reach the booking service. Please refresh to try again.");
    }
  }, [reference]);

  useEffect(() => {
    const task = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(task);
  }, [load]);

  // Hold countdown
  useEffect(() => {
    if (!info?.holdExpiresAt || !(phase === "details" || phase === "payment")) return;
    const tick = () => {
      const msLeft = new Date(info.holdExpiresAt!).getTime() - Date.now();
      if (msLeft <= 0) {
        setRemaining(0);
        setPhase("expired");
      } else setRemaining(msLeft);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [info?.holdExpiresAt, phase]);

  const submitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (f.name.trim().length < 2) errs.name = "Please share your full name.";
    if (!/^[+\d][\d\s\-()]{6,}$/.test(f.phone.trim())) errs.phone = "Please enter a valid phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) errs.email = "Please enter a valid email address.";
    if (!f.acceptTerms) errs.acceptTerms = "Please accept the policies to continue.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSending(true);
    setServerError(null);
    track("checkout_started", { reference });
    try {
      const res = await fetch("/api/booking/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, ...f }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410 || data.code === "HOLD_EXPIRED") {
          setPhase("expired");
          return;
        }
        setServerError({ message: data.error || data.message || "Checkout failed." });
        return;
      }
      setPhase(data.status === "CONFIRMED" ? "confirmed" : data.status === "PENDING_APPROVAL" ? "requested" : "payment");
      setInfo((v) => v ? { ...v, status: data.status } : v);
    } catch {
      setServerError({ message: "We couldn't reach the booking service. Please try again." });
    } finally {
      setSending(false);
    }
  };

  const startPayment = async () => {
    setPayInitiating(true);
    track("payment_started", { reference });
    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const data = await res.json();
      if (data.alreadyConfirmed) {
        setPhase("confirmed");
        return;
      }
      if (!res.ok) {
        setServerError({ message: data.error || "Payment could not be initiated." });
        return;
      }
      router.push(data.checkoutUrl);
    } catch {
      setServerError({ message: "We couldn't reach the payment service. Please try again." });
    } finally {
      setPayInitiating(false);
    }
  };

  if (loadError && !info) {
    return (
      <div className="container-editorial max-w-2xl">
        <div className="card-editorial p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-gold mx-auto" aria-hidden />
          <p className="mt-4 text-[15px]">{loadError}</p>
          <Link href="/check-your-date" className="btn-primary mt-6"><span>{cmsCopy("text.back-to-check-your-date", "Back to Check Your Date")}</span></Link>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="container-editorial max-w-4xl">
        <div className="card-editorial p-14 text-center text-stone text-sm">{cmsCopy("text.loading-your-booking", "Loading your booking…")}</div>
      </div>
    );
  }

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  const slotLabel = SLOTS.find((s) => s.id === info.slot)?.label || info.slot;

  return (
    <div className="container-editorial max-w-4xl">
      {/* ---------------------------------------------------------- EXPIRED */}
      {phase === "expired" && (
        <div className="card-editorial p-10 text-center max-w-xl mx-auto">
          <TimerReset className="h-9 w-9 text-gold mx-auto" aria-hidden />
          <h2 className="mt-5 text-xl font-normal">{cmsCopy("text.your-temporary-hold-has-expired", "Your temporary hold has expired")}</h2>
          <p className="mt-3 text-[14px] font-light leading-7 text-stone">{cmsCopy("text.the-selected-slot-was-released-back-to-the-ca", "The selected slot was released back to the calendar — that's how we keep availability honest for everyone. You can start again; nearby dates may still be open.")}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link href="/check-your-date" className="btn-primary"><span>{cmsCopy("text.start-again", "Start Again")}</span></Link>
            <a href={SITE.contact.phoneHref} className="btn-outline"><Phone className="h-4 w-4" /><span>{cmsCopy("text.contact-the-team", "Contact the Team")}</span></a>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- GONE */}
      {phase === "gone" && (
        <div className="card-editorial p-10 text-center max-w-xl mx-auto">
          <h2 className="text-xl font-normal">{cmsCopy("text.booking-not-found", "Booking not found")}</h2>
          <p className="mt-3 text-[14px] font-light text-stone">{cmsCopy("text.the-reference", "The reference ")}{reference}{cmsCopy("text.doesn-t-match-a-booking", " doesn't match a booking.")}</p>
          <Link href="/check-your-date" className="btn-primary mt-7"><span>{cmsCopy("text.check-your-date", "Check Your Date")}</span></Link>
        </div>
      )}

      {/* ------------------------------------------------- DETAILS/PAYMENT */}
      {(phase === "details" || phase === "payment") && (
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {phase === "details" ? (
                <form onSubmit={submitDetails} noValidate className="card-editorial p-6 md:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="h-sub">{cmsCopy("text.your-details", "Your Details")}</h2>
                    {info.holdExpiresAt && remaining > 0 && (
                      <span className="inline-flex items-center gap-2 chip !text-burgundy !border-burgundy/30">
                        <Clock className="h-3.5 w-3.5" />{cmsCopy("text.held", " Held ")}{mins}:{String(secs).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[12px] text-stone">{cmsCopy("text.your-venue-is-temporarily-held-while-you-subm", "Your venue is temporarily held while you submit your details.")}</p>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="label-vij" htmlFor="co-name">{cmsCopy("text.full-name", "Full Name *")}</label>
                      <input id="co-name" className="input-vij" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" aria-invalid={!!errors.name} />
                      {errors.name && <p role="alert" className="mt-1.5 text-[12px] text-destructive">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="label-vij" htmlFor="co-phone">{cmsCopy("text.mobile", "Mobile *")}</label>
                      <input id="co-phone" className="input-vij" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" placeholder={cmsCopy("placeholder.91", "+91 …")} aria-invalid={!!errors.phone} />
                      {errors.phone && <p role="alert" className="mt-1.5 text-[12px] text-destructive">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="label-vij" htmlFor="co-email">{cmsCopy("text.email", "Email *")}</label>
                      <input id="co-email" type="email" className="input-vij" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" aria-invalid={!!errors.email} />
                      {errors.email && <p role="alert" className="mt-1.5 text-[12px] text-destructive">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="label-vij" htmlFor="co-country">{cmsCopy("text.country", "Country")}</label>
                      <select id="co-country" className="input-vij" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
                        {["India", "United Arab Emirates", "Qatar", "Oman", "Saudi Arabia", "Kuwait", "Bahrain", "United Kingdom", "United States", "Singapore", "Other"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label-vij" htmlFor="co-notes">{cmsCopy("text.event-notes", "Event Notes")}</label>
                      <textarea id="co-notes" rows={3} className="input-vij !min-h-[100px] py-3 resize-y" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder={cmsCopy("placeholder.anything-the-events-team-should-know-traditio", "Anything the events team should know — traditions, vendors, timings.")} />
                    </div>
                  </div>

                  <label className="mt-6 flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={f.acceptTerms} onChange={(e) => setF({ ...f, acceptTerms: e.target.checked })} className="mt-1 h-4 w-4 accent-[#421D24]" aria-invalid={!!errors.acceptTerms} />
                    <span className="text-[12px] leading-6 text-stone">{cmsCopy("text.i-accept-the", "I accept the")}{" "}
                      <Link href="/terms" target="_blank" className="link-underline text-burgundy">{cmsCopy("text.terms", "Terms")}</Link>,{" "}
                      <Link href="/booking-policy" target="_blank" className="link-underline text-burgundy">{cmsCopy("text.booking-policy", "Booking Policy")}</Link>{" "}{cmsCopy("text.and", "and")}{" "}
                      <Link href="/cancellation-policy" target="_blank" className="link-underline text-burgundy">{cmsCopy("text.cancellation-policy", "Cancellation Policy")}</Link>{cmsCopy("text.and-the", ", and the ")}<Link href="/privacy" target="_blank" className="link-underline text-burgundy">{cmsCopy("text.privacy-notice", "privacy notice")}</Link>. *
                    </span>
                  </label>
                  {errors.acceptTerms && <p role="alert" className="mt-1.5 text-[12px] text-destructive">{errors.acceptTerms}</p>}

                  {serverError && (
                    <div role="alert" className="mt-5 border border-burgundy/30 bg-burgundy/5 p-4 text-[13px] text-burgundy">
                      {serverError.message}
                    </div>
                  )}

                  <button type="submit" disabled={sending} className="btn-primary mt-7 w-full sm:w-auto disabled:opacity-60">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    <span>{sending ? "Saving details" : info.bookingMode === "OFFLINE" ? "Submit Booking Request" : "Continue to Payment"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="card-editorial p-6 md:p-8">
                  <h2 className="h-sub">{cmsCopy("text.payment", "Payment")}</h2>
                  <p className="mt-2 text-[13px] font-light leading-7 text-stone">
                    {info.spaceName} · {prettyDate(info.eventDate)} · {slotLabel}{cmsCopy("text.your-hold-remains-active-while-you-pay-confir", ". Your hold remains active while you pay. Confirmation is issued only after server-side payment verification.")}</p>
                  {info.holdExpiresAt && remaining > 0 && <p className="mt-3 text-sm">{cmsCopy("text.hold-expires-in", "Hold expires in ")}{mins}:{String(secs).padStart(2, "0")}</p>}
                  <div className="mt-6 flex items-start gap-3 border border-gold/40 bg-gold/10 p-4 text-[12px] leading-6 text-stone">
                    <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-gold" />
                    <span>{cmsCopy("text.the-production-payment-gateway-is-being-final", "The production payment gateway is being finalised with VICC. This checkout runs in")}{" "}
                      <strong className="font-medium">{cmsCopy("text.sandbox-demonstration-mode", "sandbox demonstration mode")}</strong>{cmsCopy("text.no-real-charge-is-made", " — no real charge is made.")}</span>
                  </div>
                  <button onClick={startPayment} disabled={payInitiating} className="btn-primary mt-7 w-full disabled:opacity-60">
                    {payInitiating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    <span>{cmsCopy("text.pay", "Pay ")}{inr(info.amounts.totalPayable)}{cmsCopy("text.securely", " Securely")}</span>
                  </button>
                  <div className="mt-6 flex items-center gap-4 text-[12px] text-stone">
                    <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />{cmsCopy("text.encrypted", " Encrypted")}</span>
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />{cmsCopy("text.verified-server-side", " Verified server-side")}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{cmsCopy("text.hold-protected", " Hold protected")}</span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* SUMMARY */}
          <aside className="card-editorial p-6 lg:sticky lg:top-28">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.18em]">{cmsCopy("text.booking-summary", "Booking Summary")}</h2>
            <dl className="mt-5 space-y-3 text-[13px]">
              <Row label={cmsCopy("label.reference", "Reference")} value={info.reference} mono />
              <Row label={cmsCopy("label.venue", "Venue")} value={info.spaceName} />
              <Row label={cmsCopy("label.event-type", "Event Type")} value={titleCase(info.eventType)} />
              <Row label={cmsCopy("label.date", "Date")} value={prettyDate(info.eventDate)} />
              <Row label={cmsCopy("label.slot", "Slot")} value={`${slotLabel} — ${SLOTS.find((s) => s.id === info.slot)?.time || ""}`} />
              <Row label={cmsCopy("label.guests", "Guests")} value={String(info.guests)} />
            </dl>
            <div className="hairline-t mt-5 pt-5">
              <dl className="space-y-2.5 text-[13px]">
                <Row label={cmsCopy("label.base-rent-sample", "Base rent (sample)")} value={inr(info.amounts.base)} />
                {info.amounts.weekendUplift > 0 && <Row label={cmsCopy("label.weekend-uplift", "Weekend uplift")} value={inr(info.amounts.weekendUplift)} />}
                <Row label={cmsCopy("label.estimated-taxes", "Estimated taxes")} value={inr(info.amounts.tax)} />
                {info.bookingMode === "SANDBOX"
                  ? <Row label={cmsCopy("label.sandbox-deposit", "Sandbox deposit")} value={inr(info.amounts.totalPayable)} strong />
                  : <Row label={cmsCopy("label.estimated-total", "Estimated total")} value={inr(info.amounts.totalContract)} strong />}
              </dl>
              <p className="mt-4 text-[11px] leading-5 text-stone/80">
                {info.bookingMode === "OFFLINE" ? "No online payment is due. VIJAYA will confirm pricing and arrangements." : "Sandbox prices are for demonstration."}
              </p>
            </div>
          </aside>
        </div>
      )}

      {phase === "requested" && (
        <section className="card-editorial p-8 md:p-10 max-w-xl mx-auto text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto text-gold" aria-hidden />
          <h2 className="h-sub mt-4">{cmsCopy("text.booking-request-received", "Booking request received")}</h2>
          <p className="mt-3 text-stone">{cmsCopy("text.the-vijaya-team-will-review-your-request-for", "The VIJAYA team will review your request for ")}{info.spaceName}{cmsCopy("text.on", " on ")}{prettyDate(info.eventDate)}.</p>
          <p className="mt-4 font-medium">{cmsCopy("text.booking-reference", "Booking reference ")}{info.reference}</p>
          <p className="mt-2 text-sm text-stone">{cmsCopy("text.no-online-payment-is-due", "No online payment is due.")}</p>
          <Link className="btn-primary mt-6" href="/my-vijaya">{cmsCopy("text.track-in-my-vijaya", "Track in My VIJAYA")}</Link>
        </section>
      )}

      {/* ------------------------------------------------------- CONFIRMED */}
      {phase === "confirmed" && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: EASE }} className="max-w-2xl mx-auto">
          <div className="card-editorial overflow-hidden">
            <div className="bg-burgundy text-ivory p-8 md:p-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-gold mx-auto" aria-hidden />
              <h2 className="mt-4 text-2xl font-light">{cmsCopy("text.your-occasion-is-confirmed", "Your occasion is confirmed.")}</h2>
              <p className="mt-2 text-[14px] font-light text-ivory/70">
                {info.customerFirstName ? `${info.customerFirstName}, your` : "Your"}{cmsCopy("text.booking-reference-2", " booking reference")}</p>
              <p className="mt-3 text-3xl font-light tracking-[0.08em] text-gold">{info.reference}</p>
            </div>
            <div className="p-8 md:p-10">
              <dl className="grid gap-4 sm:grid-cols-2 text-[13px]">
                <Row label={cmsCopy("label.venue-2", "Venue")} value={info.spaceName} />
                <Row label={cmsCopy("label.date-2", "Date")} value={prettyDate(info.eventDate)} />
                <Row label={cmsCopy("label.slot-2", "Slot")} value={slotLabel} />
                <Row label={cmsCopy("label.guests-2", "Guests")} value={String(info.guests)} />
                <Row label={cmsCopy("label.payment-status", "Payment status")} value={info.payments.some((p) => p.status === "SUCCESS") ? "Payment recorded" : "Arranged with VIJAYA"} />
                <Row label={cmsCopy("label.crm-sync", "CRM sync")} value={info.crmSync === "QUEUED" ? "Queued — will sync when CRM connects" : info.crmSync} />
              </dl>
              <div className="hairline-t mt-8 pt-6 flex flex-wrap gap-4">
                <Link href="/my-vijaya" className="btn-primary"><span>{cmsCopy("text.access-my-vijaya", "Access My VIJAYA")}</span></Link>
                <button onClick={() => window.print()} className="btn-outline"><Printer className="h-4 w-4" /><span>{cmsCopy("text.print-booking", "Print Booking")}</span></button>
                <Link href="/contact" className="btn-outline"><span>{cmsCopy("text.contact-vijaya", "Contact VIJAYA")}</span></Link>
              </div>
              <p className="mt-6 text-[12px] leading-6 text-stone">{cmsCopy("text.a-confirmation-email-follows-once-notificatio", "A confirmation email follows once notifications are configured. To sign in to My VIJAYA, use this booking reference and the email you provided at checkout.")}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Row({ label, value, mono, strong, muted }: { label: string; value: string; mono?: boolean; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-stone">{label}</dt>
      <dd className={`text-right ${mono ? "font-mono text-[12px]" : ""} ${strong ? "font-medium text-burgundy text-[15px]" : muted ? "text-stone/70" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

function prettyDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
