
import { getComponentCopy } from "@/lib/cms/read";
import Link from "next/link";
import { FOOTER_NAV, SITE, SHOW_VIRTUAL_TOUR } from "@/lib/site-config";
import { Logo } from "@/components/brand/logo";

export async function SiteFooter({ navigation = FOOTER_NAV, showVirtualTour = SHOW_VIRTUAL_TOUR, address, phone, social = [] }: {
  navigation?: typeof FOOTER_NAV; showVirtualTour?: boolean; address?: string; phone?: string; social?: { href: string; label: string }[];
} = {}) {
  const cmsCopy = await getComponentCopy("copy.components.layout.site-footer");
  return (
    <footer className="mt-auto bg-ink text-ivory">
      <div className="container-editorial pt-16 pb-10 md:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo variant="gold" href="/" size="footer" />
            <p className="mt-6 max-w-sm text-sm font-light leading-7 text-ivory/60">
              {SITE.tagline}{cmsCopy("text.a-premium-destination-for-weddings-celebratio", " A premium destination for weddings, celebrations and business events in Thiruvalla, Kerala.")}</p>
            <div className="mt-6 space-y-1.5 text-sm text-ivory/70">
              {(address ? address.split("\n") : SITE.contact.addressLines).map((line) => <p key={line}>{line}</p>)}
              {phone && phone !== SITE.contact.phone && <p><a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a></p>}
              {social.length > 0 && <ul className="flex flex-wrap gap-3">{social.map((link) => <li key={link.href}><Link href={link.href}>{link.label}</Link></li>)}</ul>}
            </div>
            <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-gold/70">{cmsCopy("text.contact-details-shown-are-placeholders-pendin", "Contact details shown are placeholders pending verification")}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {navigation.map((col) => {
              const links = showVirtualTour ? col.links : col.links.filter((l) => l.href !== "/360-tour");
              return (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.28em] text-gold/90">{col.title}</h3>
                <ul className="mt-5 space-y-3">
                  {links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href} className="text-sm font-light text-ivory/65 hover:text-ivory transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              );
            })}
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-ivory/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-[12px] text-ivory/40">
          <p>© {new Date().getFullYear()} {SITE.officialName}{cmsCopy("text.all-rights-reserved", ". All rights reserved.")}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/privacy" className="hover:text-ivory/70 transition-colors">{cmsCopy("text.privacy", "Privacy")}</Link>
            <Link href="/terms" className="hover:text-ivory/70 transition-colors">{cmsCopy("text.terms", "Terms")}</Link>
            <Link href="/booking-policy" className="hover:text-ivory/70 transition-colors">{cmsCopy("text.booking-policy", "Booking Policy")}</Link>
            <Link href="/cancellation-policy" className="hover:text-ivory/70 transition-colors">{cmsCopy("text.cancellation-policy", "Cancellation Policy")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
