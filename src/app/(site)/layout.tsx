import Link from "next/link";
import { siteContent } from "@/lib/content";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ConciergeWidget } from "@/components/concierge/concierge-widget";

/** Public site chrome — header, footer and the Event Concierge. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [navigation, footer, contact, flags, announcement, seo] = await Promise.all([
    siteContent("site.navigation"), siteContent("site.footer"), siteContent("site.contact"), siteContent("site.settings"), siteContent("site.announcement"), siteContent("site.seo"),
  ]);
  const now = Date.now();
  const visible = announcement?.enabled && (!announcement.start || Date.parse(announcement.start) <= now) && (!announcement.end || Date.parse(announcement.end) > now);
  if (flags?.maintenance) return <main className="container-editorial py-24"><h1 className="h-section">VIJAYA is temporarily unavailable</h1><p className="mt-4">Please check back shortly.</p></main>;
  return (
    <>
      {seo?.structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(seo.structuredData).replace(/</g, "\\u003c") }} />}
      <SiteHeader navigation={navigation ?? undefined} showVirtualTour={flags?.showVirtualTour} />
      <div className="min-h-[calc(100vh-64px)] flex flex-col">{visible && <div className="fixed inset-x-0 bottom-0 z-40 bg-burgundy px-4 py-3 text-center text-sm text-ivory" role="status">{announcement.href ? <Link className="underline" href={announcement.href}>{announcement.text}</Link> : announcement.text}</div>}{children}</div>
      <SiteFooter navigation={footer ?? undefined} showVirtualTour={flags?.showVirtualTour} address={contact?.address} social={contact?.social} />
      <ConciergeWidget />
    </>
  );
}
