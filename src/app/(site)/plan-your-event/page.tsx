import { pageCopy, pageMetadata } from "@/lib/content";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { Reveal } from "@/components/motion/reveal";
import { SITE } from "@/lib/site-config";

const metadata: Metadata = {
  title: "Plan Your Event",
  description:
    "Tell VIJAYA about your occasion — event type, date, guests and preferences. Submit an event enquiry and the events team responds within one working day.",
};

export default async function PlanYourEventPage() {
  const copy = await pageCopy("plan-your-event");
  return (
    <main>
      <PageHero
        eyebrow={copy("eyebrow.plan-your-event", "Plan Your Event")}
        title={copy("title.tell-us-about-the-occasion", "Tell Us About the Occasion.")}
        intro={copy("intro.share-the-essentials-and-the-vijaya-events-team-sh", "Share the essentials and the VIJAYA events team shapes the rest — venue options, availability and a clear quotation.")}
        image={copy("image.exp-arrival-jpg", "/media/exp-arrival.jpg")}
        height="mid"
      />
      <section className="py-16 md:py-24">
        <div className="container-editorial grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <Suspense fallback={<div className="card-editorial p-10 text-center text-stone text-sm">{copy("text.loading-form", "Loading form…")}</div>}>
            <EnquiryForm variant="PLAN_EVENT" />
          </Suspense>
          <Reveal delay={0.1}>
            <div className="space-y-8 lg:sticky lg:top-28">
              <div className="hairline-t pt-6">
                <h2 className="text-[13px] font-medium uppercase tracking-[0.18em]">{copy("text.what-happens-next", "What happens next")}</h2>
                <ol className="mt-4 space-y-3 text-[13px] font-light leading-6 text-stone">
                  <li>{copy("text.1-your-enquiry-becomes-a-qualified-lead-in-the-vij", "1 — Your enquiry becomes a qualified lead in the VIJAYA CRM.")}</li>
                  <li>{copy("text.2-the-events-team-checks-dates-and-shortlists-spac", "2 — The events team checks dates and shortlists spaces.")}</li>
                  <li>{copy("text.3-you-receive-options-and-indicative-quotations", "3 — You receive options and indicative quotations.")}</li>
                  <li>{copy("text.4-a-venue-visit-or-virtual-consultation-seals-the", "4 — A venue visit or virtual consultation seals the plan.")}</li>
                </ol>
              </div>
              <div className="hairline-t pt-6">
                <h2 className="text-[13px] font-medium uppercase tracking-[0.18em]">{copy("text.prefer-to-talk", "Prefer to talk?")}</h2>
                <p className="mt-3 text-[14px] font-light text-stone leading-7">{copy("text.call", "Call ")}{SITE.contact.phone}{copy("text.or-email", " or email ")}{SITE.contact.email}{copy("text.contact-details-are-placeholders-pending-verificat", ". Contact details are placeholders pending verification.")}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

export const generateMetadata = () => pageMetadata("plan-your-event", metadata);
