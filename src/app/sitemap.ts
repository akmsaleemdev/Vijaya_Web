import { siteContent } from "@/lib/content";
import type { MetadataRoute } from "next";
import { SPACES } from "@/lib/data/spaces";
import { SITE, SHOW_VIRTUAL_TOUR } from "@/lib/site-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const showVirtualTour = (await siteContent("site.settings"))?.showVirtualTour ?? SHOW_VIRTUAL_TOUR;
  const base = SITE.url;
  const staticRoutes = [
    "", "/about", "/weddings", "/business", "/celebrations", "/spaces", "/experiences",
    "/gallery", "/global-desk", "/plan-your-event", "/check-your-date",
    "/book", "/venue-visit", "/contact", "/faq", "/privacy", "/terms", "/booking-policy", "/cancellation-policy",
  ].filter((r) => showVirtualTour || r !== "/360-tour").concat(showVirtualTour ? ["/360-tour"] : []);
  const now = new Date();
  return [
    ...staticRoutes.map((r) => ({ url: `${base}${r}`, lastModified: now, changeFrequency: "monthly" as const, priority: r === "" ? 1 : 0.7 })),
    ...SPACES.map((s) => ({ url: `${base}/spaces/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
