import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site-config";
import { PortalNav } from "@/components/portal/portal-nav";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "My VIJAYA",
  description: "The VIJAYA customer portal — manage your booking, payments, documents and event plan.",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <header className="bg-burgundy text-ivory">
        <div className="container-editorial flex items-center justify-between h-20">
          <Logo variant="white" href="/" size="portal" priority />
          <span className="text-[11px] uppercase tracking-[0.28em] text-ivory/70 hidden sm:block">My VIJAYA</span>
        </div>
      </header>
      <PortalNav />
      <div className="flex-1">{children}</div>
      <footer className="bg-ink text-ivory/50 text-[11px] py-5 mt-auto">
        <div className="container-editorial flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} {SITE.officialName}</span>
          <span className="flex gap-5">
            <Link href="/privacy" className="hover:text-ivory/80">Privacy</Link>
            <Link href="/booking-policy" className="hover:text-ivory/80">Booking Policy</Link>
            <Link href="/cancellation-policy" className="hover:text-ivory/80">Cancellation</Link>
            <Link href="/support" className="hover:text-ivory/80">Support</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
