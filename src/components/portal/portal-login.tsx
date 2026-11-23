"use client";
import { useCmsCopy } from "@/lib/cms/client";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";

export function PortalLogin() {
  const cmsCopy = useCmsCopy("copy.components.portal.portal-login");
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error || "Sign-in failed.", detail: data.detail });
        return;
      }
      router.push("/my-vijaya/dashboard");
      router.refresh();
    } catch {
      setError({ message: "We couldn't reach the portal. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setReference("VIJ-DEMO01");
    setEmail("demo@vijaya.example");
  };

  return (
    <div>
      <div className="text-center mb-8">
        <p className="eyebrow-dark">{cmsCopy("text.my-vijaya", "My VIJAYA")}</p>
        <h1 className="h-section mt-3">{cmsCopy("text.your-event-in-your-hands", "Your Event, In Your Hands.")}</h1>
        <p className="lede mt-3 text-[14px]">{cmsCopy("text.sign-in-with-your-booking-reference-and-the-e", "Sign in with your booking reference and the email you booked with.")}</p>
      </div>
      <form onSubmit={submit} noValidate className="card-editorial p-8">
        <div className="space-y-5">
          <div>
            <label className="label-vij" htmlFor="pl-ref">{cmsCopy("text.booking-reference", "Booking Reference")}</label>
            <input
              id="pl-ref"
              className="input-vij font-mono tracking-[0.12em] uppercase"
              placeholder={cmsCopy("placeholder.vij-xxxxxx", "VIJ-XXXXXX")}
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label-vij" htmlFor="pl-email">{cmsCopy("text.email", "Email")}</label>
            <input id="pl-email" type="email" className="input-vij" placeholder={cmsCopy("placeholder.you-example-com", "you@example.com")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
        </div>
        {error && (
          <div role="alert" className="mt-5 border border-burgundy/30 bg-burgundy/5 p-4">
            <p className="text-[13px] text-burgundy">{error.message}</p>
            {error.detail && <p className="mt-1.5 text-[12px] font-light leading-6 text-stone">{error.detail}</p>}
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary mt-7 w-full disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          <span>{loading ? "Signing in" : "Sign In"}</span>
        </button>
        <div className="hairline-t mt-7 pt-5">
          <p className="text-[12px] leading-6 text-stone">{cmsCopy("text.don-t-have-a-booking-yet", "Don't have a booking yet? ")}<a href="/check-your-date" className="link-underline text-burgundy">{cmsCopy("text.check-your-date", "Check your date")}</a>{cmsCopy("text.to-begin", " to begin.")}</p>
        </div>
      </form>
      <button onClick={fillDemo} className="mt-5 w-full text-center text-[12px] text-stone hover:text-burgundy transition-colors">{cmsCopy("text.try-the-demo-booking-vij-demo01-demo-vijaya-e", "Try the demo booking — VIJ-DEMO01 · demo@vijaya.example")}</button>
    </div>
  );
}
