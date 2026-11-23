
import { getComponentCopy } from "@/lib/cms/read";
import { pageCopy, pageMetadata } from "@/lib/content";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal, MaskReveal } from "@/components/motion/reveal";
import { Media } from "@/components/media/media";
import { VenueCard } from "@/components/booking/venue-card";
import { getPublicVenue } from "@/lib/venue-content";

const metadata: Metadata = {
  title: "Celebrations",
  description:
    "Birthdays, anniversaries, cultural and community events at VIJAYA International Convention Centre, Thiruvalla — flexible halls, lakeside settings and outdoor grounds.",
};

const CEL_SPACES = ["pamba", "kabani", "lake-area", "hospitality", "outdoor-areas", "vip-dining"];

const TYPES = [
  { title: "Private Celebrations", copy: "Birthdays, anniversaries and family milestones with intimate room settings." },
  { title: "Cultural Events", copy: "Programmes rooted in Kerala's traditions — music, dance and festival days." },
  { title: "Community Events", copy: "Associations, gatherings and large community programmes with smooth flow." },
  { title: "Entertainment", copy: "Concerts, shows and open-air evenings on the outdoor grounds." },
];

export default async function CelebrationsPage() {
  const cmsCopy = await getComponentCopy("copy.app.site.celebrations.page");
  const copy = await pageCopy("celebrations");
  const spaces = (await Promise.all(CEL_SPACES.map(getPublicVenue))).filter((space) => space !== null);

  return (
    <main>
      <PageHero
        eyebrow={copy("eyebrow.celebrations-at-vijaya", "Celebrations at VIJAYA")}
        title={copy("title.every-occasion-deserves-its-own-kind-of-grand", "Every Occasion Deserves Its Own Kind of Grand.")}
        intro={copy("intro.milestone-birthdays-anniversaries-cultural-program", "Milestone birthdays, anniversaries, cultural programmes and community gatherings — flexible spaces that scale from fifty guests to a festival.")}
        image={copy("image.image-celebrations-homepage-vijaya-vicc-webp", "/media/Image_Celebrations-Homepage-Vijaya-VICC.webp")}
        imageAlt={cmsCopy("imageAlt.celebration-experience-at-vijaya-internationa", "Celebration experience at VIJAYA International Convention Centre")}
        overlayClassName="bg-gradient-to-r from-ink/90 via-ink/50 to-transparent"
        quality={95}
        tag={false}
        ctas={[
          { label: "Check Your Date", href: "/check-your-date?eventType=CELEBRATION" },
          { label: "Plan Your Event", href: "/plan-your-event?eventType=CELEBRATION", variant: "ghost" },
        ]}
      />

      {/* TYPES */}
      <section className="py-20 md:py-28">
        <div className="container-editorial grid gap-px bg-border sm:grid-cols-2 border border-border">
          {TYPES.map((t, i) => (
            <Reveal key={t.title} delay={i * 0.05} className="bg-ivory">
              <div className="p-8 md:p-10 h-full">
                <p className="text-[10px] uppercase tracking-[0.24em] text-gold">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-3 text-xl font-medium">{t.title}</h2>
                <p className="mt-2 text-[14px] font-light leading-7 text-stone">{t.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* OUTDOOR POSSIBILITY */}
      <section className="bg-burgundy text-ivory py-20 md:py-28">
        <div className="container-editorial grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow">{copy("text.outdoor-possibilities", "Outdoor Possibilities")}</p>
            <h2 className="h-section mt-3 max-w-md">{copy("text.twilight-dinners-festival-grounds-lake-mornings", "Twilight Dinners. Festival Grounds. Lake Mornings.")}</h2>
            <p className="lede !text-ivory/70 mt-5">{copy("text.celebrations-at-vijaya-are-not-confined-to-four-wa", "Celebrations at VIJAYA are not confined to four walls. The lake deck, Kabani pavilion and open grounds give every occasion its own setting — from candlelit dinners for fifty to festival days for thousands.")}</p>
            <div className="mt-8">
              <Link href="/experiences" className="btn-outline-light"><span>{copy("text.explore-the-destination", "Explore the Destination")}</span></Link>
            </div>
          </Reveal>
          <MaskReveal className="relative aspect-[4/3]">
            <Media src={copy("src.hero-celebration-jpg", "/media/hero-celebration.jpg")} alt={copy("alt.outdoor-celebration-dinner-placeholder-visual", "Outdoor celebration dinner — placeholder visual")} sizes="(max-width: 1024px) 100vw, 50vw" />
          </MaskReveal>
        </div>
      </section>

      {/* SPACES */}
      <section className="py-20 md:py-28">
        <div className="container-editorial">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow-dark">{copy("text.available-spaces", "Available Spaces")}</p>
              <h2 className="h-section mt-3">{copy("text.spaces-for-celebrations", "Spaces for Celebrations")}</h2>
            </div>
            <Link href="/spaces" className="link-underline text-[13px] uppercase tracking-[0.18em] inline-flex items-center gap-2">{copy("text.all-spaces", "All spaces ")}<ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <div className="mt-12 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {spaces.map((s, i) => (
              <VenueCard key={s.slug} space={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* PLAN */}
      <section className="bg-ivory-deep py-20 md:py-24">
        <div className="container-editorial text-center max-w-2xl">
          <Reveal>
            <p className="eyebrow-dark">{copy("text.begin", "Begin")}</p>
            <h2 className="h-section mt-3">{copy("text.tell-us-what-you-re-celebrating", "Tell Us What You're Celebrating.")}</h2>
            <p className="lede mt-4">{copy("text.share-the-date-the-guest-count-and-the-feeling-you", "Share the date, the guest count and the feeling you're after — the events team will shape the rest with you.")}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/plan-your-event?eventType=CELEBRATION" className="btn-primary"><span>{copy("text.plan-your-event", "Plan Your Event")}</span></Link>
              <Link href="/check-your-date?eventType=CELEBRATION" className="btn-outline"><span>{copy("text.check-your-date", "Check Your Date")}</span></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

export const generateMetadata = () => pageMetadata("celebrations", metadata);
