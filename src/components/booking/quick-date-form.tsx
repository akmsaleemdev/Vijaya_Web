"use client";
import { useCmsCopy } from "@/lib/cms/client";


import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { EVENT_CATEGORIES, SLOTS, type EventCategory, type SlotId } from "@/lib/site-config";
import { track } from "@/lib/analytics";

/** Compact check-date module — homepage + reuse. Feeds the full wizard. */
export function QuickDateForm({ dark = true }: { dark?: boolean }) {
  const cmsCopy = useCmsCopy("copy.components.booking.quick-date-form");
  const router = useRouter();
  const [eventType, setEventType] = useState<EventCategory>("WEDDING");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<SlotId>("EVENING");
  const [guests, setGuests] = useState("300");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError("Please choose a preferred date.");
      return;
    }
    track("check_date_started", { source: "homepage_module", eventType });
    const params = new URLSearchParams({ eventType, date, slot, guests });
    router.push(`/check-your-date?${params.toString()}`);
  };

  const labelCls = dark ? "label-vij !text-ivory/60" : "label-vij";
  const fieldCls = dark
    ? "w-full bg-ivory/5 border border-ivory/20 text-ivory placeholder:text-ivory/40 rounded-sm min-h-[48px] px-4 text-[15px] focus:border-gold focus:outline-none transition-colors"
    : "input-vij";

  return (
    <form onSubmit={submit} className="grid gap-5 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_0.8fr_auto] md:gap-4 lg:items-end">
      <div>
        <label className={labelCls} htmlFor="qd-type">{cmsCopy("text.event-type", "Event Type")}</label>
        <select id="qd-type" value={eventType} onChange={(e) => { setEventType(e.target.value as EventCategory); track("event_type_selected", { source: "quick_form" }); }} className={fieldCls}>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id} className="text-ink">{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="qd-date">{cmsCopy("text.preferred-date", "Preferred Date")}</label>
        <input id="qd-date" type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value); if (e.target.value) track("date_selected", { source: "quick_form" }); }} className={`${fieldCls} [color-scheme:dark]`} />
      </div>
      <div>
        <label className={labelCls} htmlFor="qd-slot">{cmsCopy("text.preferred-slot", "Preferred Slot")}</label>
        <select id="qd-slot" value={slot} onChange={(e) => { setSlot(e.target.value as SlotId); track("slot_selected", { source: "quick_form" }); }} className={fieldCls}>
          {SLOTS.map((s) => (
            <option key={s.id} value={s.id} className="text-ink">{s.label} — {s.time}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="qd-guests">{cmsCopy("text.expected-guests", "Expected Guests")}</label>
        <input id="qd-guests" type="number" min={10} max={5000} value={guests} onChange={(e) => { setGuests(e.target.value); track("guest_count_selected", { source: "quick_form" }); }} className={fieldCls} placeholder={cmsCopy("placeholder.e-g-300", "e.g. 300")} />
      </div>
      <div className="md:col-span-2 lg:col-span-1">
        <button type="submit" className="btn-gold w-full lg:w-auto">
          <CalendarCheck className="h-4 w-4" />
          <span>{cmsCopy("text.check-availability", "Check Availability")}</span>
        </button>
      </div>
      {error && <p role="alert" className="md:col-span-2 lg:col-span-4 text-sm text-gold">{error}</p>}
    </form>
  );
}
