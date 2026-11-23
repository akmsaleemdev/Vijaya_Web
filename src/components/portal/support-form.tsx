"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

export function SupportForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("Booking question");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) {
      setError("Please write a short message so the team can help.");
      return;
    }
    setError(null);
    setState("sending");
    try {
      const res = await fetch("/api/portal/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "We couldn't raise your request.");
        setState("error");
        return;
      }
      setState("done");
      setMessage("");
      router.refresh();
    } catch {
      setError("We couldn't reach the support service.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="card-editorial p-10 text-center self-start">
        <CheckCircle2 className="h-9 w-9 text-available mx-auto" aria-hidden />
        <h2 className="mt-4 text-lg font-normal">Request received</h2>
        <p className="mt-2 text-[13px] font-light leading-6 text-stone">
          Your support request is logged. The events desk responds within one working day.
        </p>
        <button onClick={() => setState("idle")} className="link-underline mt-4 text-[12px] uppercase tracking-[0.16em] text-burgundy">
          Raise another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="card-editorial p-6 md:p-8 self-start">
      <h2 className="text-[13px] font-medium uppercase tracking-[0.16em]">Support Request</h2>
      <div className="mt-5 space-y-5">
        <div>
          <label className="label-vij" htmlFor="sf-subject">Subject</label>
          <select id="sf-subject" className="input-vij" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option>Booking question</option>
            <option>Payment & receipts</option>
            <option>Vendors & setup</option>
            <option>Change of plans</option>
            <option>Something else</option>
          </select>
        </div>
        <div>
          <label className="label-vij" htmlFor="sf-message">Message *</label>
          <textarea id="sf-message" rows={5} className="input-vij !min-h-[140px] py-3 resize-y" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How can the events desk help?" aria-invalid={!!error} />
          {error && <p role="alert" className="mt-1.5 text-[12px] text-destructive">{error}</p>}
        </div>
      </div>
      <button type="submit" disabled={state === "sending"} className="btn-primary mt-6 disabled:opacity-60">
        {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        <span>{state === "sending" ? "Sending" : "Send Request"}</span>
      </button>
    </form>
  );
}
