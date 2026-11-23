import { pageCopy, pageMetadata, siteContent } from "@/lib/content";
import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { Reveal } from "@/components/motion/reveal";
import { SITE } from "@/lib/site-config";

const metadata: Metadata = {
  title: "Contact",
  description: "Reach VIJAYA International Convention Centre — phone, email and enquiry form. Thiruvalla, Pathanamthitta, Kerala.",
};

export default async function ContactPage() {
  const [copy, contact] = await Promise.all([pageCopy("contact"), siteContent("site.contact")]);
  const phone = contact?.phone ?? SITE.contact.phone;
  const email = contact?.email ?? SITE.contact.email;
  const address = contact?.address?.split("\n") ?? SITE.contact.addressLines;
  return (
    <main>
      <PageHero
        eyebrow={copy("eyebrow.contact", "Contact")}
        title={copy("title.let-s-talk-about-your-occasion", "Let's Talk About Your Occasion.")}
        intro={copy("intro.call-write-or-visit-the-vijaya-team-responds-withi", "Call, write or visit — the VIJAYA team responds within one working day.")}
        image={copy("image.exp-architecture-jpg", "/media/exp-architecture.jpg")}
        height="mid"
      />
      <section className="py-16 md:py-24">
        <div className="container-editorial grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <Reveal>
            <div className="space-y-8">
              <div className="hairline-t pt-6">
                <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                  <Phone className="h-4 w-4 text-gold" />{copy("text.phone", " Phone")}</h2>
                <a href={`tel:${phone.replace(/[^+0-9]/g, "")}`} className="mt-3 block text-lg font-light link-underline w-fit">
                  {phone}
                </a>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-stone/70">{copy("text.placeholder-pending-verification", "Placeholder — pending verification")}</p>
              </div>
              <div className="hairline-t pt-6">
                <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                  <Mail className="h-4 w-4 text-gold" />{copy("text.email", " Email")}</h2>
                <p className="mt-3 text-[15px] font-light">{email}</p>
                <p className="mt-1 text-[13px] font-light text-stone">{copy("text.global-desk", "Global Desk: ")}{SITE.contact.globalDeskEmail}</p>
              </div>
              <div className="hairline-t pt-6">
                <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                  <MapPin className="h-4 w-4 text-gold" />{copy("text.address", " Address")}</h2>
                <p className="mt-3 text-[14px] font-light leading-7 text-stone">
                  {address.map((l) => (
                    <span key={l} className="block">{l}</span>
                  ))}
                </p>
                {contact?.map && <a className="link-underline" href={contact.map}>View map</a>}
              </div>
              <div className="hairline-t pt-6">
                <h2 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]">
                  <Clock className="h-4 w-4 text-gold" />{copy("text.office-hours", " Office hours")}</h2>
                <p className="mt-3 text-[14px] font-light leading-7 text-stone">{contact?.hours ?? copy("text.monday-saturday-9-30-am-6-00-pm", "Monday – Saturday, 9:30 AM – 6:00 PM")}<br />{copy("text.event-days-the-venue-is-yours", "Event days — the venue is yours.")}</p>
              </div>
            </div>
          </Reveal>
          <Suspense fallback={<div className="card-editorial p-10 text-center text-stone text-sm">{copy("text.loading-form", "Loading form…")}</div>}>
            <EnquiryForm variant="CONTACT" />
          </Suspense>
        </div>
      </section>
    </main>
  );
}

export const generateMetadata = () => pageMetadata("contact", metadata);
