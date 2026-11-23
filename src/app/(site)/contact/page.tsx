import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { Reveal } from "@/components/motion/reveal";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach VIJAYA International Convention Centre — phone, email and enquiry form. Thiruvalla, Pathanamthitta, Kerala.",
};

export default function ContactPage() {
  return (
    <main>
      <PageHero
        eyebrow="Contact"
        title="Let's Talk About Your Occasion."
        intro="Call, write or visit — the VIJAYA team responds within one working day."
        image="/media/exp-architecture.jpg"
        height="mid"
      />
      <section className="py-16 md:py-24">
        <div className="container-editorial grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <div className="space-y-8">
              <div className="hairline-t pt-6">
                <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                  <Phone className="h-4 w-4 text-gold" /> Phone
                </h2>
                <a href={SITE.contact.phoneHref} className="mt-3 block text-lg font-light link-underline w-fit">
                  {SITE.contact.phone}
                </a>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-stone/70">Placeholder — pending verification</p>
              </div>
              <div className="hairline-t pt-6">
                <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                  <Mail className="h-4 w-4 text-gold" /> Email
                </h2>
                <p className="mt-3 text-[15px] font-light">{SITE.contact.email}</p>
                <p className="mt-1 text-[13px] font-light text-stone">Global Desk: {SITE.contact.globalDeskEmail}</p>
              </div>
              <div className="hairline-t pt-6">
                <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                  <MapPin className="h-4 w-4 text-gold" /> Address
                </h2>
                <p className="mt-3 text-[14px] font-light leading-7 text-stone">
                  {SITE.contact.addressLines.map((l) => (
                    <span key={l} className="block">{l}</span>
                  ))}
                </p>
              </div>
              <div className="hairline-t pt-6">
                <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                  <Clock className="h-4 w-4 text-gold" /> Office hours
                </h2>
                <p className="mt-3 text-[14px] font-light leading-7 text-stone">
                  Monday – Saturday, 9:30 AM – 6:00 PM<br />Event days — the venue is yours.
                </p>
              </div>
            </div>
          </Reveal>
          <Suspense fallback={<div className="card-editorial p-10 text-center text-stone text-sm">Loading form…</div>}>
            <EnquiryForm variant="CONTACT" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
