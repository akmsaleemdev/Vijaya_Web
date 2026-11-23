"use client";
import { useCmsCopy } from "@/lib/cms/client";


import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { SLOTS, type SlotId } from "@/lib/site-config";
import { track } from "@/lib/analytics";

/** Compact per-space availability check on the space detail page. */
export function SpaceAvailabilityWidget({ slug }: { slug: string }) {
  const cmsCopy = useCmsCopy("copy.components.booking.space-availability-widget");
  const router = useRouter();
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<SlotId>("EVENING");
  const [guests, setGuests] = useState("300");
  const [result, setResult] = useState<null | { free: boolean; label: string }>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    if (!date) {
      setError("Choose a date first.");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    track("availability_checked", { venue: slug, date, slot });
    try {
      const res = await fetch("/api/availability/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, slot, guests: parseInt(guests, 10) || 100, venue: slug }),
      });
      const data = await res.json();
      const match = (data.spaces || []).find((s: { slug: string }) => s.slug === slug);
      if (!match) {
        setResult({ free: false, label: "This space doesn't fit the guest count you entered." });
      } else if (match.available) {
        setResult({ free: true, label: "Good news — this space looks available for your slot." });
      } else {
        setResult({ free: false, label: "This space is already booked or held for that slot." });
      }
    } catch {
      setError("We couldn't verify availability just now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-editorial p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={`sa-date-${slug}`} className="label-vij">{cmsCopy("text.date", "Date")}</label>
          <input id={`sa-date-${slug}`} type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} className="input-vij !min-h-[44px]" />
        </div>
        <div>
          <label htmlFor={`sa-slot-${slug}`} className="label-vij">{cmsCopy("text.slot", "Slot")}</label>
          <select id={`sa-slot-${slug}`} value={slot} onChange={(e) => setSlot(e.target.value as SlotId)} className="input-vij !min-h-[44px]">
            {SLOTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`sa-guests-${slug}`} className="label-vij">{cmsCopy("text.guests", "Guests")}</label>
          <input id={`sa-guests-${slug}`} type="number" min={10} value={guests} onChange={(e) => setGuests(e.target.value)} className="input-vij !min-h-[44px]" />
        </div>
      </div>
      <button onClick={check} disabled={loading} className="btn-primary mt-5 w-full sm:w-auto disabled:opacity-60">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
        <span>{loading ? "Checking" : "Check This Space"}</span>
      </button>
      {error && <p role="alert" className="mt-4 text-[13px] text-destructive">{error}</p>}
      {result && (
        <div
          role="status"
          className={`mt-5 flex items-start gap-3 p-4 text-[13px] leading-6 ${
            result.free ? "bg-[#4a6b4f]/10 text-[#33513a]" : "bg-burgundy/5 text-burgundy"
          }`}
        >
          <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${result.free ? "bg-available" : "bg-blocked"}`} aria-hidden />
          <div>
            <p>{result.label}</p>
            {result.free && (
              <button
                onClick={() => {
                  track("booking_started", { venue: slug, date, slot });
                  router.push(`/check-your-date?venue=${slug}&date=${date}&slot=${slot}&guests=${guests}&auto=1`);
                }}
                className="mt-2 link-underline font-medium text-burgundy"
              >{cmsCopy("text.continue-to-booking", "Continue to booking →")}</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
