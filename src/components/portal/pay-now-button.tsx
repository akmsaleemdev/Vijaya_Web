"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet, CheckCircle2 } from "lucide-react";
import { track } from "@/lib/analytics";

export function PayNowButton({ amount, label }: { amount: number; label: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "paying" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const pay = async () => {
    setState("paying");
    setMessage(null);
    track("payment_started", { source: "portal", amount });
    try {
      const res = await fetch("/api/portal/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, purpose: "balance" }),
      });
      const data = await res.json();
      if (!res.ok) {
        track("payment_failed", { source: "portal" });
        setState("error");
        setMessage(data.error || "Payment failed. Please try again.");
        return;
      }
      track("payment_success", { source: "portal", amount });
      setState("done");
      router.refresh();
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      setMessage("We couldn't reach the payment service.");
    }
  };

  if (state === "done") {
    return (
      <p role="status" className="mt-6 inline-flex items-center gap-2 text-[13px] text-available">
        <CheckCircle2 className="h-4 w-4" /> Payment received — receipt added to your documents.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <button onClick={pay} disabled={state === "paying"} className="btn-primary disabled:opacity-60">
        {state === "paying" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        <span>{state === "paying" ? "Processing" : label}</span>
      </button>
      {message && <p role="alert" className="mt-3 text-[12px] text-destructive">{message}</p>}
      <p className="mt-3 text-[11px] text-stone/80">Sandbox mode — no real charge is made.</p>
    </div>
  );
}
