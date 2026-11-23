/**
 * VIJAYA price engine — SAMPLE rules pending approved VIJAYA data.
 * Every rule here is provisional and clearly surfaced as "indicative" in the UI.
 */

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
  const d = new Date(dateISO + "T00:00:00");
  const day = d.getUTCDay();
  return day === 5 || day === 6 || day === 0; // Fri–Sun (SAMPLE rule)
}

export function quoteFor(spaceSlug: string, dateISO: string, slot: SlotId): Quote {
  const space = SPACE_BY_SLUG[spaceSlug];
  const base = space?.pricing?.[slot] ?? space?.pricing?.fullDay ?? 0;
  const weekendUplift = isWeekend(dateISO) ? Math.round(base * 0.1) : 0;
  const subtotal = base + weekendUplift;
  const tax = Math.round(subtotal * BOOKING_CONFIG.taxRateSample);
  const totalContract = subtotal + tax;
  const deposit = Math.round(subtotal * BOOKING_CONFIG.tokenShare);
  const totalPayable = deposit + Math.round(deposit * BOOKING_CONFIG.taxRateSample);
  const balanceDue = totalContract - deposit;
  return { base, weekendUplift, tax, deposit, totalPayable, balanceDue, totalContract };
}

export function inr(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
