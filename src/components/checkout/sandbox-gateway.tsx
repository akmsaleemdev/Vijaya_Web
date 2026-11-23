"use client";

/**
 * Sandbox payment gateway — simulates a real gateway's hosted checkout.
 * The production gateway (TO BE CONFIRMED with VICC) replaces this page;
 * the contract below stays identical: initiate → hosted pay → server webhook.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, Landmark, Smartphone, Wallet, ShieldCheck } from "lucide-react";
import { inr } from "@/lib/pricing";
import { track } from "@/lib/analytics";

type Outcome = "idle" | "processing" | "pending" | "failed" | "success";

const METHODS = [
  { id: "upi", label: "UPI", icon: Smartphone, note: "Instant · no charges" },
  { id: "card", label: "Card", icon: CreditCard, note: "Visa · Mastercard · RuPay" },
  { id: "netbanking", label: "Net Banking", icon: Landmark, note: "All major banks" },
];

export default function SandboxGatewayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-stone text-sm">Loading gateway…</div>}>
      <SandboxGateway />
    </Suspense>
  );
}

function SandboxGateway() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get("ref") || "";
  const providerRef = params.get("pay") || "";
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState("upi");
  const [outcome, setOutcome] = useState<Outcome>("idle");
  const [reason, setReason] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  useEffect(() => {
    if (!reference) return;
    fetch(`/api/booking/${reference}`)
      .then((r) => r.json())
      .then((d) => setAmount(d.amounts?.totalPayable ?? null))
      .catch(() => setAmount(null));
  }, [reference]);

  const pay = async (result: "SUCCESS" | "PENDING" | "FAILED") => {
    setOutcome("processing");
    try {
      const res = await fetch("/api/payment/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerRef, outcome: result }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        track("payment_success", { reference, providerRef });
        setOutcome("success");
        if (pollRef.current) clearInterval(pollRef.current);
        setTimeout(() => router.push(`/book/${reference}?state=confirmed`), 1800);
      } else if (data.status === "PENDING") {
        setOutcome("pending");
        // Poll status — the booking is confirmed only via the server path.
        pollRef.current = setInterval(async () => {
          pollCountRef.current += 1;
          const st = await fetch("/api/payment/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ providerRef }),
          }).then((r) => r.json());
          if (st.status === "SUCCESS") {
            if (pollRef.current) clearInterval(pollRef.current);
            track("payment_success", { reference, providerRef });
            setOutcome("success");
            setTimeout(() => router.push(`/book/${reference}?state=confirmed`), 1600);
          } else if (pollCountRef.current > 12) {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }, 3000);
      } else {
        track("payment_failed", { reference, providerRef });
        setReason(data.reason || "The payment was declined.");
        setOutcome("failed");
      }
    } catch {
      setReason("We couldn't reach the gateway. Please try again.");
      setOutcome("failed");
    }
  };

  return (
    <main className="min-h-screen bg-ink text-ivory flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold">VIJAYA Secure Pay</p>
          <h1 className="mt-3 text-2xl font-light">Sandbox Gateway</h1>
          <p className="mt-2 text-[12px] text-ivory/50">
            {reference ? `Booking ${reference}` : "Missing booking reference"} · {providerRef || "—"}
          </p>
          <p className="mt-4 text-4xl font-light">{amount !== null ? inr(amount) : "…"}</p>
        </div>

        <div className="bg-ivory text-ink rounded-sm p-7">
          {outcome === "idle" && (
            <>
              <p className="label-vij">Payment method</p>
              <div className="grid gap-3">
                {METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-4 border rounded-sm px-4 py-3.5 text-left transition-all ${
                      method === m.id ? "border-burgundy bg-burgundy/5" : "border-border hover:border-burgundy/40"
                    }`}
                    aria-pressed={method === m.id}
                  >
                    <m.icon className="h-5 w-5 text-burgundy" />
                    <span className="flex-1">
                      <span className="block text-[14px] font-medium">{m.label}</span>
                      <span className="block text-[11px] text-stone">{m.note}</span>
                    </span>
                    {method === m.id && <span className="h-3 w-3 rounded-full bg-burgundy" aria-hidden />}
                  </button>
                ))}
              </div>
              <div className="mt-6 space-y-2">
                <button onClick={() => pay("SUCCESS")} className="btn-primary w-full"><span>Pay Now</span></button>
                <button onClick={() => pay("PENDING")} className="btn-outline w-full !text-[11px]"><span>Simulate pending</span></button>
                <button onClick={() => pay("FAILED")} className="btn-outline w-full !text-[11px]"><span>Simulate failure</span></button>
              </div>
            </>
          )}

          {outcome === "processing" && (
            <div className="py-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto" aria-hidden />
              <p className="mt-4 text-sm">Processing your payment…</p>
              <p className="mt-1 text-[12px] text-stone">Do not close this window.</p>
            </div>
          )}

          {outcome === "pending" && (
            <div className="py-10 text-center" role="status">
              <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto" aria-hidden />
              <p className="mt-4 text-sm font-medium">Payment pending</p>
              <p className="mt-2 text-[13px] font-light leading-6 text-stone max-w-xs mx-auto">
                Your bank is taking longer than usual to respond. We're checking with the gateway — this usually
                resolves within a minute. Your hold stays protected.
              </p>
              <Link href={`/book/${reference}`} className="link-underline mt-4 inline-block text-[12px] uppercase tracking-[0.16em] text-burgundy">
                Continue to status page
              </Link>
            </div>
          )}

          {outcome === "failed" && (
            <div className="py-8 text-center" role="alert">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" aria-hidden />
              <p className="mt-4 text-sm font-medium">Payment failed</p>
              <p className="mt-2 text-[13px] font-light leading-6 text-stone">{reason}</p>
              <div className="mt-6 flex flex-col gap-3">
                <button onClick={() => setOutcome("idle")} className="btn-primary w-full"><span>Try Another Method</span></button>
                <Link href={`/book/${reference}`} className="btn-outline w-full"><span>Back to Booking</span></Link>
              </div>
            </div>
          )}

          {outcome === "success" && (
            <div className="py-10 text-center" role="status">
              <CheckCircle2 className="h-10 w-10 text-available mx-auto" aria-hidden />
              <p className="mt-4 text-sm font-medium">Payment successful</p>
              <p className="mt-2 text-[13px] text-stone">Confirming your booking…</p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-ivory/40 flex items-center justify-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" /> Server-verified · idempotent callbacks · sandbox mode
        </p>
      </motion.div>
    </main>
  );
}
