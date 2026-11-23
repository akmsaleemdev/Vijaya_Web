import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Globe2, Maximize, Video } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal, MaskReveal } from "@/components/motion/reveal";
import { Media } from "@/components/media/media";
import { VenueCard } from "@/components/booking/venue-card";
import { SPACES } from "@/lib/data/spaces";
import { SHOW_VIRTUAL_TOUR } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Weddings",
  description:
    "Grand weddings and receptions at VIJAYA International Convention Centre, Thiruvalla — indoor halls, lakeside ceremonies, NRI planning support and private venue tours.",
};

const WEDDING_SPACES = ["periyar", "nila", "kabani", "lake-area", "hospitality", "outdoor-areas"];

export default function WeddingsPage() {
  const spaces = WEDDING_SPACES.map((s) => SPACES.find((x) => x.slug === s)!).filter(Boolean);

  return (
    <main>
      <PageHero
        eyebrow="Weddings at VIJAYA"
        title="Where Kerala's Finest Weddings Come Home."
        intro="Scale, ritual and beauty in one destination — grand halls, lakeside vows and a team that treats your wedding like the once-in-a-lifetime occasion it is."
        image="/media/Weddings Page Section-_Hero Image 2-Weddings Page-Vijaya-VICC.webp"
        imageAlt="Wedding ceremony setup on the lawns of VIJAYA International Convention Centre with floral mandap and fountain"
        overlayClassName="bg-gradient-to-r from-ink/85 via-ink/45 to-transparent"
        tag={false}
        ctas={[
          { label: "Check Your Date", href: "/check-your-date?eventType=WEDDING" },
          { label: "Book a Private Venue Tour", href: "/venue-visit?eventType=WEDDING", variant: "ghost" },
        ]}
      />

      {/* POSITIONING */}
      <section className="py-20 md:py-28">
        <div className="container-editorial grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <Reveal>
            <p className="eyebrow-dark">The VIJAYA Wedding</p>
            <h2 className="h-section mt-3 max-w-md">One Address. Every Ritual, Every Guest, Every Detail.</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="space-y-5 text-[15px] font-light leading-8 text-stone">
              <p>
                A wedding at VIJAYA unfolds across the whole destination. The morning ceremony by the lake. The
                reception in Periyar, our grandest hall. Quiet family moments in the VIP dining room. Guests arriving
                through a porte-cochère that sets the tone before a single word is spoken.
              </p>
              <p>
                Our events team choreographs vendor arrivals, green rooms, guest flow and service corridors so the day
                feels effortless to you and invisible to your guests. From NRI families planning from the GCC to
                hometown celebrations of a thousand guests, the same principle applies — calm people, precise plans,
                beautiful spaces.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* INDOOR + OUTDOOR POSSIBILITIES */}
      <section className="bg-burgundy text-ivory py-20 md:py-28">
        <div className="container-editorial">
          <Reveal>
            <p className="eyebrow">Indoor + Outdoor</p>
            <h2 className="h-section mt-3 max-w-2xl">Empty Space to Celebration.</h2>
            <p className="lede !text-ivory/70 mt-4 max-w-2xl">
              Halls are bare canvases in the morning and full worlds by evening. This is the transformation your
              guests will never see coming — and never forget.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <MaskReveal className="relative aspect-[16/10]">
              <Media
                src="/media/Weddings Page Section-_Image3-Weddings Page-Vijaya-VICC.webp"
                alt="Outdoor destination wedding setup at VIJAYA International Convention Centre"
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={95}
                tag={false}
              />
            </MaskReveal>
            <MaskReveal className="relative aspect-[16/10]" delay={0.15}>
              <Media
                src="/media/Weddings Page Section-_Image2-Weddings Page-Vijaya-VICC.webp"
                alt="Lakeside destination wedding setup at VIJAYA International Convention Centre"
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={95}
                tag={false}
              />
            </MaskReveal>
          </div>
        </div>
      </section>

      {/* SPACES */}
      <section className="py-20 md:py-28">
        <div className="container-editorial">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow-dark">Wedding Spaces</p>
              <h2 className="h-section mt-3">Spaces for Every Chapter of the Day</h2>
            </div>
            <Link href="/spaces" className="link-underline text-[13px] uppercase tracking-[0.18em] inline-flex items-center gap-2">
              All spaces <ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <div className="mt-12 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {spaces.map((s, i) => (
              <VenueCard key={s.slug} space={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* SHOWREEL + 360 */}
      <section className="bg-ink text-ivory py-20 md:py-28">
        <div className="container-editorial grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow">See It Before You Visit</p>
            <h2 className="h-display mt-4">{SHOW_VIRTUAL_TOUR ? "Showreel & 360° Tour." : "Showreel & Gallery."}</h2>
            <p className="lede !text-ivory/70 mt-5">
              {SHOW_VIRTUAL_TOUR
                ? "Our new showreel and drone films are in production. Until they premiere, walk the halls yourself in the 360° experience — drag, zoom and move between spaces."
                : "Our new showreel and drone films are in production. Until they premiere, explore the halls through the gallery — every space, photographed in detail."}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {SHOW_VIRTUAL_TOUR && (
                <Link href="/360-tour" className="btn-gold"><Maximize className="h-4 w-4" /><span>Enter 360° Experience</span></Link>
              )}
              <Link href="/gallery" className="btn-outline-light"><Video className="h-4 w-4" /><span>View Gallery</span></Link>
            </div>
            <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-ivory/40">Showreel premiere — placeholder pending VIJAYA media</p>
          </Reveal>
          <MaskReveal className="relative aspect-video">
            <div className="absolute inset-0 flex items-center justify-center bg-sand/10 border border-ivory/10">
              <div className="text-center px-6">
                <Video className="h-8 w-8 text-gold mx-auto" aria-hidden />
                <p className="mt-4 text-sm text-ivory/60 font-light">VIJAYA wedding showreel — awaiting official media</p>
              </div>
            </div>
          </MaskReveal>
        </div>
      </section>

      {/* NRI / GLOBAL DESK */}
      <section className="bg-burgundy-deep text-ivory py-20 md:py-24">
        <div className="container-editorial flex flex-col lg:flex-row lg:items-center gap-10 justify-between">
          <Reveal className="max-w-xl">
            <p className="eyebrow">Planning From Abroad?</p>
            <h2 className="h-section mt-3">The VIJAYA Global Desk</h2>
            <p className="lede !text-ivory/70 mt-4">
              {SHOW_VIRTUAL_TOUR ? "360° tours, " : ""}virtual consultations, remote date checking and digital documentation — built for families
              across the UAE, Qatar, Oman, Saudi Arabia, Kuwait and Bahrain.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/global-desk" className="btn-gold"><Globe2 className="h-4 w-4" /><span>Visit the Global Desk</span></Link>
              <Link href="/check-your-date?eventType=WEDDING" className="btn-outline-light"><span>Check Your Date</span></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
