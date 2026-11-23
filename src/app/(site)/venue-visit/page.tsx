import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/layout/page-hero";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { Reveal } from "@/components/motion/reveal";
import { VisitTracker } from "@/components/forms/visit-tracker";

export const metadata: Metadata = {
  title: "Book a Venue Visit",
  description:
    "Walk VIJAYA before you book — request a private venue visit with the events team, with your event in mind.",
};

export default function VenueVisitPage() {
  return (
    <main>
      <VisitTracker />
      <PageHero
        eyebrow="Venue Visit"
        title="Walk the Destination Before You Decide."
        intro="A private visit with the VIJAYA events team — halls, lake, VIP facilities and the spots only locals know. Bring your questions; we bring the coffee."
        image="/media/about-hero.jpg"
        height="mid"
      />
      <section className="py-16 md:py-24">
        <div className="container-editorial max-w-3xl">
          <Suspense fallback={<div className="card-editorial p-10 text-center text-stone text-sm">Loading form…</div>}>
            <EnquiryForm variant="VENUE_VISIT" />
          </Suspense>
          <Reveal className="mt-8">
            <p className="text-[12px] leading-6 text-stone/80">
              Visits run in two windows on most days — morning and afternoon. If your date falls on an event day,
              we'll suggest the closest alternative so you see the destination at its calmest.
            </p>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
