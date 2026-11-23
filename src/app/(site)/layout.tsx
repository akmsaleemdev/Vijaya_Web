
import { CmsCopyProvider } from "@/lib/cms/client";
import { getCopyBundle, getComponentCopy } from "@/lib/cms/read";
import Link from "next/link";
import { siteContent } from "@/lib/content";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ConciergeWidget } from "@/components/concierge/concierge-widget";

/** Public site chrome — header, footer and the Event Concierge. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const cmsCopy = await getComponentCopy("copy.app.site.layout");
  const [navigation, footer, contact, flags, announcement] = await Promise.all([
    siteContent("site.navigation"), siteContent("site.footer"), siteContent("site.contact"), siteContent("site.settings"), siteContent("site.announcement"),
  ]);
  const now = Date.now();
  const visible = announcement?.enabled && (!announcement.start || Date.parse(announcement.start) <= now) && (!announcement.end || Date.parse(announcement.end) > now);
  if (flags?.maintenance) return <main className="container-editorial py-24"><h1 className="h-section">{cmsCopy("text.vijaya-is-temporarily-unavailable", "VIJAYA is temporarily unavailable")}</h1><p className="mt-4">{cmsCopy("text.please-check-back-shortly", "Please check back shortly.")}</p></main>;
  return (
    <CmsCopyProvider bundle={await getCopyBundle("site")}>
    <>
      <SiteHeader navigation={navigation ?? undefined} showVirtualTour={flags?.showVirtualTour} />
      <div className="min-h-[calc(100vh-64px)] flex flex-col">{visible && <div className="fixed inset-x-0 bottom-0 z-40 bg-burgundy px-4 py-3 text-center text-sm text-ivory" role="status">{announcement.href ? <Link className="underline" href={announcement.href}>{announcement.text}</Link> : announcement.text}</div>}{children}</div>
      <SiteFooter navigation={footer ?? undefined} showVirtualTour={flags?.showVirtualTour} address={contact?.address} phone={contact?.phone} social={contact?.social} />
      <ConciergeWidget />
    </>
    </CmsCopyProvider>
  );
}
