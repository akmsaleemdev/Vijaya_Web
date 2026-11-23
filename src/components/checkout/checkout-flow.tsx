"use client";

/**
 * Checkout flow — steps 7–9 of the booking journey.
 * 7: Your Details → 8: Payment (gateway handoff) → 9: Confirmed.
 * Server-side rules: the hold is revalidated, payment verified via webhook,
 * confirmation never comes from the browser.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const params = useSearchParams();
  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"details" | "payment" | "confirmed" | "expired" | "gone">("details");
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
      else if (data.status === "EXPIRED" || data.status === "CANCELLED") setPhase("expired");
      else setPhase("details");
    } catch {
      setLoadError("We couldn't reach the booking service. Please refresh to try again.");
    }
  }, [reference]);

  useEffect(() => {
    load();
  }, [load]);

  // Hold countdown
  useEffect(() => {
    if (!info?.holdExpiresAt || phase !== "details") return;
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

  // If payment returned to this page after the gateway, refresh state.
  useEffect(() => {
    if (params.get("state") === "confirmed") setPhase("confirmed");
    if (params.get("state") === "payment") setPhase("payment");
  }, [params]);

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
        if (res.status === 410) {
          setPhase("expired");
          return;
        }
        setServerError({ message: data.error || data.message || "Checkout failed." });
        return;
      }
      setPhase("payment");
      setInfo((v) => v ? { ...v, status: "PENDING_PAYMENT" } : v);
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
          <Link href="/check-your-date" className="btn-primary mt-6"><span>Back to Check Your Date</span></Link>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="container-editorial max-w-4xl">
        <div className="card-editorial p-14 text-center text-stone text-sm">Loading your booking…</div>
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
          <h2 className="mt-5 text-xl font-normal">Your temporary hold has expired</h2>
          <p className="mt-3 text-[14px] font-light leading-7 text-stone">
            The selected slot was released back to the calendar — that's how we keep availability honest for everyone.
            You can start again; nearby dates may still be open.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Link href="/check-your-date" className="btn-primary"><span>Start Again</span></Link>
            <a href={SITE.contact.phoneHref} className="btn-outline"><Phone className="h-4 w-4" /><span>Contact the Team</span></a>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- GONE */}
      {phase === "gone" && (
        <div className="card-editorial p-10 text-center max-w-xl mx-auto">
          <h2 className="text-xl font-normal">Booking not found</h2>
          <p className="mt-3 text-[14px] font-light text-stone">The reference {reference} doesn't match a booking.</p>
          <Link href="/check-your-date" className="btn-primary mt-7"><span>Check Your Date</span></Link>
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
                    <h2 className="h-sub">Your Details</h2>
                    {info.holdExpiresAt && remaining > 0 && (
                      <span className="inline-flex items-center gap-2 chip !text-burgundy !border-burgundy/30">
                        <Clock className="h-3.5 w-3.5" /> Held {mins}:{String(secs).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[12px] text-stone">
                    Your venue is temporarily reserved while you complete payment.
                  </p>
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="label-vij" htmlFor="co-name">Full Name *</label>
                      <input id="co-name" className="input-vij" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" aria-invalid={!!errors.name} />
                      {errors.name && <p role="alert" className="mt-1.5 text-[12px] text-destructive">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="label-vij" htmlFor="co-phone">Mobile *</label>
                      <input id="co-phone" className="input-vij" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" placeholder="+91 …" aria-invalid={!!errors.phone} />
                      {errors.phone && <p role="alert" className="mt-1.5 text-[12px] text-destructive">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="label-vij" htmlFor="co-email">Email *</label>
                      <input id="co-email" type="email" className="input-vij" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" aria-invalid={!!errors.email} />
                      {errors.email && <p role="alert" className="mt-1.5 text-[12px] text-destructive">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="label-vij" htmlFor="co-country">Country</label>
                      <select id="co-country" className="input-vij" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
                        {["India", "United Arab Emirates", "Qatar", "Oman", "Saudi Arabia", "Kuwait", "Bahrain", "United Kingdom", "United States", "Singapore", "Other"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label-vij" htmlFor="co-notes">Event Notes</label>
                      <textarea id="co-notes" rows={3} className="input-vij !min-h-[100px] py-3 resize-y" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Anything the events team should know — traditions, vendors, timings." />
                    </div>
                  </div>

                  <label className="mt-6 flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={f.acceptTerms} onChange={(e) => setF({ ...f, acceptTerms: e.target.checked })} className="mt-1 h-4 w-4 accent-[#421D24]" aria-invalid={!!errors.acceptTerms} />
                    <span className="text-[12px] leading-6 text-stone">
                      I accept the{" "}
                      <Link href="/terms" target="_blank" className="link-underline text-burgundy">Terms</Link>,{" "}
                      <Link href="/booking-policy" target="_blank" className="link-underline text-burgundy">Booking Policy</Link>{" "}
                      and{" "}
                      <Link href="/cancellation-policy" target="_blank" className="link-underline text-burgundy">Cancellation Policy</Link>
                      , and the <Link href="/privacy" target="_blank" className="link-underline text-burgundy">privacy notice</Link>. *
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
                    <span>{sending ? "Saving details" : "Continue to Payment"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <div className="card-editorial p-6 md:p-8">
                  <h2 className="h-sub">Payment</h2>
                  <p className="mt-2 text-[13px] font-light leading-7 text-stone">
                    {info.spaceName} · {prettyDate(info.eventDate)} · {slotLabel}. Your hold remains active while you
                    pay. Confirmation is issued only after server-side payment verification.
                  </p>
                  <div className="mt-6 flex items-start gap-3 border border-gold/40 bg-gold/10 p-4 text-[12px] leading-6 text-stone">
                    <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-gold" />
                    <span>
                      The production payment gateway is being finalised with VICC. This checkout runs in{" "}
                      <strong className="font-medium">sandbox demonstration mode</strong> — no real charge is made.
                    </span>
                  </div>
                  <button onClick={startPayment} disabled={payInitiating} className="btn-primary mt-7 w-full disabled:opacity-60">
                    {payInitiating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    <span>Pay {inr(info.amounts.totalPayable)} Securely</span>
                  </button>
                  <div className="mt-6 flex items-center gap-4 text-[12px] text-stone">
                    <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Encrypted</span>
                    <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Verified server-side</span>
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Hold protected</span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* SUMMARY */}
          <aside className="card-editorial p-6 lg:sticky lg:top-28">
            <h2 className="text-[13px] font-medium uppercase tracking-[0.18em]">Booking Summary</h2>
            <dl className="mt-5 space-y-3 text-[13px]">
              <Row label="Reference" value={info.reference} mono />
              <Row label="Venue" value={info.spaceName} />
              <Row label="Event Type" value={titleCase(info.eventType)} />
              <Row label="Date" value={prettyDate(info.eventDate)} />
              <Row label="Slot" value={`${slotLabel} — ${SLOTS.find((s) => s.id === info.slot)?.time || ""}`} />
              <Row label="Guests" value={String(info.guests)} />
            </dl>
            <div className="hairline-t mt-5 pt-5">
              <dl className="space-y-2.5 text-[13px]">
                <Row label="Base rent (sample)" value={inr(info.amounts.base)} />
                {info.amounts.weekendUplift > 0 && <Row label="Weekend uplift" value={inr(info.amounts.weekendUplift)} />}
                <Row label="Taxes (sample 12%)" value={inr(info.amounts.tax)} />
                <Row label="Token / deposit now" value={inr(info.amounts.totalPayable)} strong />
                <Row label="Balance due later" value={inr(info.amounts.totalContract - info.amounts.deposit)} muted />
              </dl>
              <p className="mt-4 text-[11px] leading-5 text-stone/80">
                Sample pricing pending VIJAYA approval. All charges are shown before payment — no hidden additions.
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* ------------------------------------------------------- CONFIRMED */}
      {phase === "confirmed" && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: EASE }} className="max-w-2xl mx-auto">
          <div className="card-editorial overflow-hidden">
            <div className="bg-burgundy text-ivory p-8 md:p-10 text-center">
              <CheckCircle2 className="h-12 w-12 text-gold mx-auto" aria-hidden />
              <h2 className="mt-4 text-2xl font-light">Your occasion is confirmed.</h2>
              <p className="mt-2 text-[14px] font-light text-ivory/70">
                {info.customerFirstName ? `${info.customerFirstName}, your` : "Your"} booking reference
              </p>
              <p className="mt-3 text-3xl font-light tracking-[0.08em] text-gold">{info.reference}</p>
            </div>
            <div className="p-8 md:p-10">
              <dl className="grid gap-4 sm:grid-cols-2 text-[13px]">
                <Row label="Venue" value={info.spaceName} />
                <Row label="Date" value={prettyDate(info.eventDate)} />
                <Row label="Slot" value={slotLabel} />
                <Row label="Guests" value={String(info.guests)} />
                <Row label="Payment status" value={info.payments.some((p) => p.status === "SUCCESS") ? "Paid (sandbox)" : "Pending"} />
                <Row label="CRM sync" value={info.crmSync === "QUEUED" ? "Queued — will sync when CRM connects" : info.crmSync} />
              </dl>
              <div className="hairline-t mt-8 pt-6 flex flex-wrap gap-4">
                <Link href="/my-vijaya" className="btn-primary"><span>Access My VIJAYA</span></Link>
                <button onClick={() => window.print()} className="btn-outline"><Printer className="h-4 w-4" /><span>Print Receipt</span></button>
                <Link href="/contact" className="btn-outline"><span>Contact VIJAYA</span></Link>
              </div>
              <p className="mt-6 text-[12px] leading-6 text-stone">
                A confirmation email follows once notifications are configured. To sign in to My VIJAYA, use this
                booking reference and the email you provided at checkout.
              </p>
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
