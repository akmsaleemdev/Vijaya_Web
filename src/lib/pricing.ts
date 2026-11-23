/**
 * VIJAYA price engine — SAMPLE rules pending approved VIJAYA data.
 * Every rule here is provisional and clearly surfaced as "indicative" in the UI.
 */

import { priceConfig } from "./booking/price-config";
import { SPACE_BY_SLUG } from "@/lib/data/spaces";
import { BOOKING_CONFIG, type SlotId } from "@/lib/site-config";

export interface Quote {
  base: number;
  weekendUplift: number;
  tax: number;
  deposit: number;
  totalPayable: number;
  balanceDue: number;
  totalContract: number;
}

export function isWeekend(dateISO: string): boolean {
  const d = new Date(dateISO + "T00:00:00Z");
  const day = d.getUTCDay();
  return day === 5 || day === 6 || day === 0; // Fri–Sun (SAMPLE rule)
}

export function quoteFor(spaceSlug: string, dateISO: string, slot: string, raw?: string | null, extras = 0): Quote {
  const space = SPACE_BY_SLUG[spaceSlug];
  const rules = raw ? priceConfig.parse(JSON.parse(raw)) : undefined;
  const seasonal = rules?.seasonal?.find(({ from, to }) => dateISO >= from && dateISO <= to)?.multiplier ?? 1;
  const base = Math.round((rules?.base?.[slot] ?? space?.pricing?.[slot as SlotId] ?? space?.pricing?.fullDay ?? 0) * seasonal) + extras;
  const weekendUplift = isWeekend(dateISO) ? Math.round(base * (rules?.weekend ?? 0.1)) : 0;
  const subtotal = base + weekendUplift;
  const taxRate = rules?.tax ?? BOOKING_CONFIG.taxRateSample;
  const tax = Math.round(subtotal * taxRate);
  const totalContract = subtotal + tax;
  const deposit = Math.round(subtotal * (rules?.advance ?? BOOKING_CONFIG.tokenShare));
  const totalPayable = deposit + Math.round(deposit * taxRate);
  const balanceDue = totalContract - totalPayable;
  return { base, weekendUplift, tax, deposit, totalPayable, balanceDue, totalContract };
}

export function inr(n: number | { toNumber(): number }): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(typeof n === "number" ? n : n.toNumber());
}
