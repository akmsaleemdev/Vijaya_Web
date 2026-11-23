"use client";

/**
 * Check Your Date — the core booking product (steps 1–6 of the 9-step journey).
 * Steps 7–9 (details → payment → confirmation) continue at /book/[reference].
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Briefcase, CalendarDays, Check, ChevronLeft, ChevronRight,
  Heart, Loader2, Lock, PartyPopper, Users, Maximize, AlertTriangle,
} from "lucide-react";
import { SHOW_VIRTUAL_TOUR } from "@/lib/site-config";
import { EVENT_CATEGORIES, SLOTS, type EventCategory, type SlotId } from "@/lib/site-config";
import { SPACE_BY_SLUG } from "@/lib/data/spaces";
import { track } from "@/lib/analytics";
import { inr } from "@/lib/pricing";

interface AvailabilitySpace {
  slug: string;
  name: string;
  setting: string;
  isCombo: boolean;
  childSlugs: string[];
  available: boolean;
  status: string | null;
  guestRange: [number, number] | null;
  requiresApproval: boolean;
  indicative: string;
}

interface CheckResponse {
  spaces: AvailabilitySpace[];
  crmNotice: string | null;
  error?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function CheckYourDateWizard() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState<EventCategory | null>(
    (params.get("eventType") as EventCategory) || null
  );
  const [date, setDate] = useState<string>(params.get("date") || "");
  const [slot, setSlot] = useState<SlotId>((params.get("slot") as SlotId) || "EVENING");
  const [guests, setGuests] = useState<string>(params.get("guests") || "");
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [cal, setCal] = useState<Record<string, { free: number; total: number }> | null>(null);
  const [results, setResults] = useState<CheckResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [holding, setHolding] = useState<string | null>(null);
  const [holdError, setHoldError] = useState<{ message: string; detail?: string } | null>(null);
  const [venuePreselect] = useState<string | null>(params.get("venue"));

  // Auto-start flow when arriving with query params (from space pages / homepage)
  useEffect(() => {
    if (params.get("eventType")) setStep(params.get("date") ? 3 : 2);
  }, [params]);

  // Calendar availability
  useEffect(() => {
    if (step !== 2) return;
    const ctrl = new AbortController();
    fetch(`/api/availability/calendar?month=${month}&guests=${parseInt(guests, 10) || ""}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setCal(d.days || null))
      .catch(() => setCal(null));
    return () => ctrl.abort();
  }, [step, month, guests]);

  const runCheck = useCallback(async () => {
    setChecking(true);
    setResultError(null);
    track("availability_checked", { eventType, date, slot, guests });
    try {
      const res = await fetch("/api/availability/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, slot, guests: parseInt(guests, 10) || 0, eventType }),
      });
      const data: CheckResponse = await res.json();
      if (!res.ok) {
        setResultError(data.error || "We couldn't check availability just now. Please try again.");
      } else {
        setResults(data);
        setStep(4);
      }
    } catch {
      setResultError("We couldn't reach the booking engine. Please check your connection and try again.");
    } finally {
      setChecking(false);
    }
  }, [date, slot, guests, eventType]);

  const createHold = async (spaceSlug: string) => {
    setHolding(spaceSlug);
    setHoldError(null);
    track("booking_started", { venue: spaceSlug, date, slot, guests });
    try {
      const res = await fetch("/api/booking/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceSlug, date, slot, guests: parseInt(guests, 10), eventType }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setHoldError({ message: data.message || "This space was just booked.", detail: data.detail });
          setResults((r) => r ? { ...r, spaces: r.spaces.map((s) => s.slug === spaceSlug ? { ...s, available: false, status: "TEMPORARY_HOLD" } : s) } : r);
        } else {
          setHoldError({ message: data.error || data.message || "We couldn't create your hold." });
        }
        return;
      }
      track("temporary_hold_created", { venue: spaceSlug, reference: data.reference });
      router.push(`/book/${data.reference}`);
    } catch {
      setHoldError({ message: "We couldn't reach the booking engine. Please try again." });
    } finally {
      setHolding(null);
    }
  };

  // Auto-create the hold when arriving from a space page with auto=1
  useEffect(() => {
    if (venuePreselect && params.get("auto") === "1" && date && step === 3) {
      createHold(venuePreselect);
    }
     
  }, [venuePreselect, params, date, step]);

  const progress = useMemo(() => {
    const labels = ["Event", "Date", "Guests", "Results", "Book"];
    return labels;
  }, []);

  return (
    <div className="container-editorial max-w-4xl">
      {/* Progress */}
      <ol className="flex items-center gap-2 mb-8" aria-label="Booking progress">
        {progress.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const current = step === n;
          return (
            <li key={label} className="flex items-center gap-2 flex-1 last:flex-none">
              <span
                aria-current={current ? "step" : undefined}
                className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] whitespace-nowrap ${
                  current ? "text-burgundy font-medium" : done ? "text-available" : "text-stone/60"
                }`}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                  current ? "border-burgundy bg-burgundy text-ivory" : done ? "border-available bg-available text-ivory" : "border-stone/40"
                }`}>
                  {done ? <Check className="h-3 w-3" /> : n}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </span>
              {n < progress.length && <span className={`h-px flex-1 ${done ? "bg-available/60" : "bg-stone/25"}`} aria-hidden />}
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          {/* ------------------------------------------------ STEP 1 */}
          {step === 1 && (
            <div>
              <h2 className="h-section">What are you planning?</h2>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {EVENT_CATEGORIES.map((c) => {
                  const icons = { WEDDING: Heart, BUSINESS: Briefcase, CELEBRATION: PartyPopper } as const;
                  const Icon = icons[c.id];
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setEventType(c.id); track("event_type_selected", { type: c.id }); setStep(2); }}
                      className="group card-editorial p-8 text-left transition-all duration-500 hover:border-burgundy hover:shadow-[0_18px_50px_-20px_rgba(66,29,36,0.35)]"
                    >
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-burgundy/5 text-burgundy transition-colors group-hover:bg-burgundy group-hover:text-ivory">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-5 text-lg font-medium">{c.label}</h3>
                      <p className="mt-2 text-[13px] font-light leading-6 text-stone">{c.blurb}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------ STEP 2 */}
          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} className="mb-6 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-stone hover:text-ink transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <h2 className="h-section">When?</h2>
              <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
                {/* Custom availability calendar */}
                <div className="card-editorial p-6">
                  <div className="flex items-center justify-between mb-5">
                    <button onClick={() => prevMonth(month, setMonth)} aria-label="Previous month" className="p-2 hover:bg-muted rounded-sm transition-colors">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <p className="text-[14px] font-medium">{monthLabel(month)}</p>
                    <button onClick={() => nextMonth(month, setMonth)} aria-label="Next month" className="p-2 hover:bg-muted rounded-sm transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-stone/70 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <span key={d} className="py-1">{d}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays(month, cal).map((cell, i) => {
                      if (!cell.day) return <span key={i} />;
                      const selected = date === cell.day;
                      const past = cell.day < new Date().toISOString().slice(0, 10);
                      const freeRatio = cell.free === null ? null : cell.total ? cell.free / cell.total : 0;
                      const cls = past
                        ? "text-stone/30 cursor-not-allowed line-through"
                        : freeRatio === 0
                        ? "text-stone/50 bg-muted/60 cursor-not-allowed"
                        : selected
                        ? "bg-burgundy text-ivory font-medium"
                        : freeRatio !== null && freeRatio < 0.4
                        ? "text-burgundy bg-gold/15 hover:bg-gold/30"
                        : "text-ink hover:bg-gold/20 cursor-pointer";
                      return (
                        <button
                          key={i}
                          disabled={past || freeRatio === 0}
                          onClick={() => { setDate(cell.day!); track("date_selected", { date: cell.day }); }}
                          className={`aspect-square text-[13px] rounded-sm transition-colors ${cls} ${selected ? "ring-2 ring-gold ring-offset-1 ring-offset-ivory" : ""}`}
                          title={cell.free === null ? "" : `${cell.free}/${cell.total} spaces free`}
                          aria-label={`${cell.day}${cell.free !== null ? `, ${cell.free} of ${cell.total} spaces available` : ""}`}
                          aria-pressed={selected}
                        >
                          {parseInt(cell.day!.slice(-2), 10)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-stone">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-burgundy" /> Selected</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-muted" /> Unavailable</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-gold/40" /> Limited spaces</span>
                  </div>
                </div>
                {/* Slot + continue */}
                <div>
                  <p className="label-vij">Slot</p>
                  <div className="grid gap-3">
                    {SLOTS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setSlot(s.id); track("slot_selected", { slot: s.id }); }}
                        className={`text-left border rounded-sm px-5 py-4 transition-all duration-300 ${
                          slot === s.id ? "border-burgundy bg-burgundy/5" : "border-border hover:border-burgundy/40"
                        }`}
                        aria-pressed={slot === s.id}
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-[14px] font-medium">{s.label}</span>
                          {slot === s.id && <Check className="h-4 w-4 text-burgundy" />}
                        </span>
                        <span className="text-[12px] text-stone">{s.time}</span>
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={!date}
                    onClick={() => setStep(3)}
                    className="btn-primary mt-6 w-full disabled:opacity-40"
                  >
                    <span>Continue</span> <ArrowRight className="h-4 w-4" />
                  </button>
                  {!date && <p className="mt-3 text-[12px] text-stone">Select a date to continue.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------ STEP 3 */}
          {step === 3 && (
            <div>
              <button onClick={() => setStep(2)} className="mb-6 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-stone hover:text-ink transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <h2 className="h-section">How many guests?</h2>
              <div className="mt-8 max-w-xl">
                <div className="card-editorial p-8">
                  <div className="flex items-center justify-between">
                    <Users className="h-6 w-6 text-gold" aria-hidden />
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setGuests(String(Math.max(10, (parseInt(guests, 10) || 100) - 25)))}
                        className="h-11 w-11 rounded-full border border-border hover:border-burgundy transition-colors"
                        aria-label="Fewer guests"
                      >−</button>
                      <input
                        type="number"
                        min={10}
                        max={5000}
                        value={guests}
                        onChange={(e) => { setGuests(e.target.value); if (e.target.value) track("guest_count_selected", {}); }}
                        className="w-28 text-center text-3xl font-light bg-transparent border-b border-border focus:border-gold focus:outline-none"
                        aria-label="Expected guests"
                      />
                      <button
                        onClick={() => setGuests(String((parseInt(guests, 10) || 100) + 25))}
                        className="h-11 w-11 rounded-full border border-border hover:border-burgundy transition-colors"
                        aria-label="More guests"
                      >+</button>
                    </div>
                  </div>
                  <p className="mt-6 text-[12px] text-stone text-center">An estimate is fine — it helps us match the right halls.</p>
                </div>
                <button
                  disabled={!guests || parseInt(guests, 10) < 1}
                  onClick={runCheck}
                  className="btn-primary mt-6 w-full disabled:opacity-40"
                >
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                  <span>{checking ? "Checking availability" : "Check Availability"}</span>
                </button>
                {resultError && (
                  <p role="alert" className="mt-4 text-[13px] text-destructive flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {resultError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ------------------------------------------------ STEP 4/5 */}
          {step === 4 && results && (
            <div>
              <button onClick={() => setStep(3)} className="mb-6 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.16em] text-stone hover:text-ink transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <h2 className="h-section">Available Spaces</h2>
              <p className="lede mt-3 text-[14px] max-w-2xl">
                {prettyDate(date)} · {SLOTS.find((s) => s.id === slot)?.label} · {guests} guests. Only compatible,
                available spaces are shown.
              </p>

              {results.crmNotice && (
                <p className="mt-5 flex items-start gap-2.5 border border-gold/40 bg-gold/10 p-4 text-[12px] leading-6 text-stone">
                  <Lock className="h-4 w-4 mt-0.5 shrink-0 text-gold" /> {results.crmNotice}
                </p>
              )}

              <div className="mt-8 space-y-4">
                {results.spaces.map((s) => {
                  const space = SPACE_BY_SLUG[s.slug];
                  return (
                    <div key={s.slug} className={`card-editorial overflow-hidden transition-all ${s.available ? "" : "opacity-55"}`}>
                      <div className="grid sm:grid-cols-[220px_1fr]">
                        <div className="relative aspect-[16/10] sm:aspect-auto">
                          { }
                          <img src={space.heroImage} alt={space.heroImageAlt ?? `${space.officialName} — placeholder visual`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                        </div>
                        <div className="p-6">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-medium">{s.name}</h3>
                                {s.isCombo && <span className="chip !py-0.5 !text-[9px]">Combined</span>}
                              </div>
                              <p className="mt-1 text-[12px] text-stone">
                                {s.setting === "INDOOR" ? "Indoor" : "Outdoor"}
                                {s.guestRange ? ` · ${s.guestRange[0]}–${s.guestRange[1]} guests (indicative)` : ""}
                              </p>
                            </div>
                            <span className={`chip !py-1 ${s.available ? "!text-available !border-available/40" : "!text-stone"}`}>
                              {s.available ? "Available" : s.status === "TEMPORARY_HOLD" ? "Just held" : s.status === "CONFIRMED" ? "Booked" : "Unavailable"}
                            </span>
                          </div>
                          <p className="mt-3 text-[13px] font-light leading-6 text-stone line-clamp-2">{space.shortDescription}</p>
                          <p className="mt-2 text-[12px] text-stone">{s.indicative}</p>

                          <div className="mt-5 flex flex-wrap items-center gap-3">
                            {s.available ? (
                              <button onClick={() => createHold(s.slug)} disabled={holding !== null} className="btn-primary !min-h-[42px] !px-5 !text-[11px] disabled:opacity-60">
                                {holding === s.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                                <span>{holding === s.slug ? "Creating hold" : "Hold This Space"}</span>
                              </button>
                            ) : (
                              <span className="text-[12px] text-stone italic">Unavailable for this slot — try another date or space.</span>
                            )}
                            <button
                              onClick={() => setExpanded(expanded === s.slug ? null : s.slug)}
                              className="btn-outline !min-h-[42px] !px-5 !text-[11px]"
                              aria-expanded={expanded === s.slug}
                            >
                              <span>{expanded === s.slug ? "Hide details" : "Explore"}</span>
                            </button>
                            <a href={`/spaces/${s.slug}`} target="_blank" rel="noreferrer" className="link-underline text-[11px] uppercase tracking-[0.16em] text-burgundy">
                              Full page
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Step 5: explore panel */}
                      <AnimatePresence>
                        {expanded === s.slug && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease: EASE }}
                            className="overflow-hidden border-t border-border bg-ivory-deep/60"
                          >
                            <div className="p-6 grid gap-6 md:grid-cols-3 text-[13px]">
                              <div>
                                <p className="label-vij">Best for</p>
                                <p className="font-light text-stone">{space.idealEventTypes.join(", ")}</p>
                                <p className="label-vij mt-4">Layouts</p>
                                <p className="font-light text-stone">{space.seatingLayouts.join(", ") || "—"}</p>
                              </div>
                              <div>
                                <p className="label-vij">AV &amp; lighting</p>
                                <p className="font-light text-stone">{[...space.avFacilities, ...space.lightingFacilities].slice(0, 4).join(", ") || "—"}</p>
                                <p className="label-vij mt-4">Slot rules</p>
                                <p className="font-light text-stone">{space.slotRules}</p>
                              </div>
                              <div>
                                {SHOW_VIRTUAL_TOUR && space.scenes360.length > 0 && (
                                  <a href="/360-tour" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-burgundy link-underline">
                                    <Maximize className="h-4 w-4" /> Walk this space in 360°
                                  </a>
                                )}
                                <div className="mt-4 grid grid-cols-3 gap-2">
                                  {space.gallery.slice(0, 3).map((g, i) => (
                                    <div key={i} className="relative aspect-square overflow-hidden">
                                      { }
                                      <img src={g} alt={`${space.officialName} view ${i + 1} — placeholder`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {holdError && (
                <div role="alert" className="mt-6 border border-burgundy/30 bg-burgundy/5 p-5">
                  <p className="flex items-start gap-2.5 text-[14px] text-burgundy">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> {holdError.message}
                  </p>
                  {holdError.detail && <p className="mt-2 pl-7 text-[13px] font-light leading-6 text-stone">{holdError.detail}</p>}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------

function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

function prevMonth(month: string, set: (m: string) => void) {
  const next = shiftMonth(month, -1);
  const now = new Date().toISOString().slice(0, 7);
  if (next < now) return;
  set(next);
}

function nextMonth(month: string, set: (m: string) => void) {
  set(shiftMonth(month, 1));
}

interface CalCell { day: string | null; free: number | null; total: number | null }

function calendarDays(month: string, cal: Record<string, { free: number; total: number }> | null): CalCell[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const cells: CalCell[] = [];
  for (let i = 0; i < lead; i++) cells.push({ day: null, free: null, total: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const day = `${month}-${String(d).padStart(2, "0")}`;
    const entry = cal?.[day];
    cells.push({ day, free: entry ? entry.free : null, total: entry ? entry.total : null });
  }
  return cells;
}

function prettyDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
