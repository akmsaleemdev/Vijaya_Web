import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ConciergeWidget } from "@/components/concierge/concierge-widget";

/** Public site chrome — header, footer and the Event Concierge. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="min-h-[calc(100vh-64px)] flex flex-col">{children}</div>
      <SiteFooter />
      <ConciergeWidget />
    </>
  );
}
