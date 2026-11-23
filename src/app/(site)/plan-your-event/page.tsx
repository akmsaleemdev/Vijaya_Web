import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { Reveal } from "@/components/motion/reveal";
import { SITE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Plan Your Event",
  description:
    "Tell VIJAYA about your occasion — event type, date, guests and preferences. Submit an event enquiry and the events team responds within one working day.",
};

export default function PlanYourEventPage() {
  return (
    <main>
      <PageHero
        eyebrow="Plan Your Event"
        title="Tell Us About the Occasion."
        intro="Share the essentials and the VIJAYA events team shapes the rest — venue options, availability and a clear quotation."
        image="/media/exp-arrival.jpg"
        height="mid"
      />
      <section className="py-16 md:py-24">
        <div className="container-editorial grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <Suspense fallback={<div className="card-editorial p-10 text-center text-stone text-sm">Loading form…</div>}>
            <EnquiryForm variant="PLAN_EVENT" />
          </Suspense>
          <Reveal delay={0.1}>
            <div className="space-y-8 lg:sticky lg:top-28">
              <div className="hairline-t pt-6">
                <h2 className="text-[13px] font-medium uppercase tracking-[0.18em]">What happens next</h2>
                <ol className="mt-4 space-y-3 text-[13px] font-light leading-6 text-stone">
                  <li>1 — Your enquiry becomes a qualified lead in the VIJAYA CRM.</li>
                  <li>2 — The events team checks dates and shortlists spaces.</li>
                  <li>3 — You receive options and indicative quotations.</li>
                  <li>4 — A venue visit or virtual consultation seals the plan.</li>
                </ol>
              </div>
              <div className="hairline-t pt-6">
                <h2 className="text-[13px] font-medium uppercase tracking-[0.18em]">Prefer to talk?</h2>
                <p className="mt-3 text-[14px] font-light text-stone leading-7">
                  Call {SITE.contact.phone} or email {SITE.contact.email}. Contact details are placeholders pending verification.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
