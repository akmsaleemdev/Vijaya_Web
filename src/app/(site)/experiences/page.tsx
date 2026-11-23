import type { Metadata } from "next";
import Link from "next/link";
import { Maximize } from "lucide-react";
import { EXPERIENCES } from "@/lib/data/content";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal, MaskReveal, Parallax } from "@/components/motion/reveal";
import { Media } from "@/components/media/media";
import { SHOW_VIRTUAL_TOUR } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Experiences",
  description:
    "Architecture, arrival, landscape, the lake, VIP experience and hospitality — explore the VIJAYA destination beyond the halls.",
};

export default function ExperiencesPage() {
  return (
    <main>
      <PageHero
        eyebrow="The Destination"
        title="Beyond the Halls, a World Composed."
        intro="Architecture and landscape, arrival and farewell, water and light — VIJAYA is designed as one continuous experience."
        image="/media/Destinations Section_Hero Image1-VICC.webp"
        imageAlt="The VIJAYA International Convention Centre destination at a glance"
        overlayClassName="bg-gradient-to-r from-ink/85 via-ink/45 to-transparent"
        quality={95}
        tag={false}
        ctas={SHOW_VIRTUAL_TOUR ? [{ label: "Enter 360° Experience", href: "/360-tour" }] : []}
      />

      <section className="py-16 md:py-24" aria-label="Destination experiences">
        <div className="container-editorial">
          {EXPERIENCES.map((b, i) => {
            const flipped = i % 2 === 1;
            return (
              <article key={b.id} id={b.id} className="grid gap-10 lg:grid-cols-2 lg:items-center py-12 md:py-20 scroll-mt-24">
                <Parallax strength={26} className={`relative aspect-[4/3] overflow-hidden ${flipped ? "lg:order-2" : ""}`}>
                  <Media src={b.image} alt={`${b.title} at VIJAYA International Convention Centre`} sizes="(max-width: 1024px) 100vw, 50vw" quality={95} tag={false} />
                </Parallax>
                <Reveal className={flipped ? "lg:order-1" : ""}>
                  <p className="eyebrow-dark">{String(i + 1).padStart(2, "0")}</p>
                  <h2 className="h-section mt-3">{b.title}</h2>
                  <p className="lede mt-4 max-w-lg">{b.text}</p>
                  {b.helipad && (
                    <p className="mt-5 border-l-2 border-gold pl-4 text-[13px] leading-7 text-stone">
                      Operated strictly under DGCA regulations and event-day clearance. Never confirmed online — always
                      arranged with VIJAYA operations.
                    </p>
                  )}
                </Reveal>
              </article>
            );
          })}
        </div>
      </section>

      {/* 360° experience section — hidden while SHOW_VIRTUAL_TOUR is false.
          Retained internally for re-enabling later via src/lib/site-config.ts. */}
      {SHOW_VIRTUAL_TOUR && (
      <section className="bg-ink text-ivory py-20 md:py-28">
        <div className="container-editorial grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow">Immersive</p>
            <h2 className="h-display mt-4">Explore the Property in 360°.</h2>
            <p className="lede !text-ivory/70 mt-5">
              Drag to look around, zoom into details and jump between spaces — from the grand hall to the lake deck.
            </p>
            <div className="mt-8">
              <Link href="/360-tour" className="btn-gold"><Maximize className="h-4 w-4" /><span>Enter 360° Experience</span></Link>
            </div>
          </Reveal>
          <MaskReveal className="relative aspect-video">
            <Media src="/media/pano-hall.jpg" alt="360 panorama preview — placeholder" sizes="50vw" tag={false} />
          </MaskReveal>
        </div>
      </section>
      )}
    </main>
  );
}
