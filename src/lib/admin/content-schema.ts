import { z } from "zod";

const text = z.string().trim().min(1).max(6000);
const url = z.string().max(1000).refine((value) => /^\/(?![\\/])/.test(value) && !value.includes("\\") || /^https:\/\//i.test(value), "Use a site path or HTTPS URL.");
const local = z.string().regex(/^\/(?:media|brand|api\/media)\/[a-zA-Z0-9/_ .%-]+\.(?:jpg|jpeg|png|webp|avif|mp4|webm|pdf)$/i);
const link = z.object({ label: text, href: url });
export const contentSchemas = {
  "home.hero": z.object({ eyebrow: text, heading: text, intro: text, cta: link, poster: local, posterAlt: text, desktop: local, mobile: local }).partial(),
  "gallery.items": z.array(z.object({ src: local, alt: text, category: text, caption: text.optional(), published: z.boolean().optional() })).max(300),
  "site.navigation": z.array(link).max(16),
  "site.footer": z.array(z.object({ title: text, links: z.array(link).max(20) })).max(15),
  "site.contact": z.object({ phone: text, email: z.email(), address: text, whatsapp: text, map: url, hours: text, social: z.array(link).max(10) }).partial(),
  "site.settings": z.object({ showVirtualTour: z.boolean(), maintenance: z.boolean(), holdMinutes: z.number().int().min(1).max(1440), timezone: z.literal("Asia/Kolkata"), currency: z.literal("INR") }).partial(),
  "site.announcement": z.object({ text, enabled: z.boolean(), start: z.iso.datetime().optional(), end: z.iso.datetime().optional(), href: url.optional() }),
  "site.faq": z.array(z.object({ q: text, a: text, category: z.enum(["Booking", "Planning", "Facilities", "Policies"]) })).max(100),
  "site.seo": z.object({ title: text, description: text, ogImage: url, canonical: url, structuredData: z.record(z.string(), z.unknown()) }).partial(),
  "collections.testimonials": z.array(z.object({ title: text, body: text })).max(100),
  "collections.offers": z.array(z.object({ title: text, body: text })).max(100),
  "collections.team": z.array(z.object({ title: text, body: text })).max(100),
  "collections.awards": z.array(z.object({ title: text, body: text })).max(100),
  "collections.news": z.array(z.object({ title: text, body: text })).max(100),
} as const;

const pageContent = z.record(z.string().regex(/^[a-zA-Z0-9_.-]+$/), z.string().max(8000)).refine((row) => Object.keys(row).length <= 300);
const templateContent = z.partialRecord(z.enum(["received", "confirmed", "reminder", "cancelled", "receipt"]), z.object({ subject: z.string().max(160), body: text }));
export function schemaFor(key: string): z.ZodType | undefined {
  if (key === "email.templates") return templateContent;
  if (key.startsWith("page.") || key.startsWith("venue.")) return pageContent;
  if (Object.hasOwn(contentSchemas, key)) return contentSchemas[key as keyof typeof contentSchemas];
  return undefined;
}

export const contentInput = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9_.-]{1,100}$/),
  locale: z.enum(["en", "ml"]).default("en"),
  action: z.enum(["DRAFT", "PUBLISH", "UNPUBLISH", "RESTORE", "DELETE"]),
  payload: z.unknown().optional(), version: z.string().max(100).optional(),
});
