import type { Metadata } from "next";
import { FAQS } from "@/lib/data/content";
import { PageHero } from "@/components/layout/page-hero";
import { FaqAccordion } from "@/components/booking/faq-accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about booking, planning, facilities and policies at VIJAYA International Convention Centre.",
};

export default function FaqPage() {
  return (
    <main>
      <PageHero
        eyebrow="FAQ"
        title="Questions, Answered Calmly."
        intro="Booking, planning, facilities and policies — the essentials, without the jargon."
        image="/media/about-hero.jpg"
        height="mid"
      />
      <section className="py-16 md:py-24">
        <div className="container-editorial max-w-3xl">
          <FaqAccordion items={FAQS} />
        </div>
      </section>
    </main>
  );
}
