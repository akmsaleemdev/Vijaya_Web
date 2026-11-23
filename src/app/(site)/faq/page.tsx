import { pageCopy, pageMetadata, siteContent } from "@/lib/content";
import type { Metadata } from "next";
import { FAQS } from "@/lib/data/content";
import { PageHero } from "@/components/layout/page-hero";
import { FaqAccordion } from "@/components/booking/faq-accordion";

const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about booking, planning, facilities and policies at VIJAYA International Convention Centre.",
};

export default async function FaqPage() {
  const [copy, items] = await Promise.all([pageCopy("faq"), siteContent("site.faq")]);
  return (
    <main>
      <PageHero
        eyebrow={copy("eyebrow.faq", "FAQ")}
        title={copy("title.questions-answered-calmly", "Questions, Answered Calmly.")}
        intro={copy("intro.booking-planning-facilities-and-policies-the-essen", "Booking, planning, facilities and policies — the essentials, without the jargon.")}
        image={copy("image.about-hero-jpg", "/media/about-hero.jpg")}
        height="mid"
      />
      <section className="py-16 md:py-24">
        <div className="container-editorial max-w-3xl">
          <FaqAccordion items={items?.map(({ q, a, category }) => ({ q, a, group: category })) ?? FAQS} />
        </div>
      </section>
    </main>
  );
}

export const generateMetadata = () => pageMetadata("faq", metadata);
