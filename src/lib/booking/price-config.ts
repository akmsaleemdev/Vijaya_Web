import { z } from "zod";

const amount = z.number().int().min(0).max(100000000);
const rate = z.number().min(0).max(1);
export const priceConfig = z.object({
  base: z.record(z.string(), amount).optional(),
  weekend: rate.optional(),
  tax: rate.optional(),
  advance: rate.optional(),
  seasonal: z.array(z.object({ from: z.iso.date(), to: z.iso.date(), multiplier: z.number().min(0).max(10) }).refine((row) => row.from <= row.to)).max(40).optional(),
  addOns: z.array(z.object({ name: z.string().min(1).max(80), price: amount })).max(40).refine((rows) => new Set(rows.map((row) => row.name)).size === rows.length).optional(),
  cancellation: z.string().max(4000).optional(),
});
