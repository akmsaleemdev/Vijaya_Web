
import { getComponentCopy } from "@/lib/cms/read";
import { pageCopy, pageMetadata } from "@/lib/content";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, MapPin, Users } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { Media } from "@/components/media/media";
import { VenueCard } from "@/components/booking/venue-card";
import { getPublicVenue } from "@/lib/venue-content";

const metadata: Metadata = {
  title: "Business & MICE",
  description:
    "Conferences, exhibitions, product launches and leadership events at VIJAYA International Convention Centre, Thiruvalla, Kerala — with AV-ready halls, parking and floor plans.",
};

const BIZ_SPACES = ["periyar", "hospitality", "pamba", "boardroom", "nila", "vip-dining"];

const FORMATS = [
  { title: "Meetings", copy: "Boardrooms and quiet lounges for decision-making days." },
  { title: "Conferences", copy: "Theatre-style halls with AV readiness and smooth foyer flow." },
  { title: "Exhibitions", copy: "Open halls and outdoor grounds with service-gate access." },
  { title: "Product Launches", copy: "Stage-focused configurations with branding opportunities." },
  { title: "Awards", copy: "Banquet evenings with stage, lighting scenes and VIP routes." },
  { title: "Leadership Events", copy: "Discreet offsites with executive dining and lounge access." },
];

export default async function BusinessPage() {
  const cmsCopy = await getComponentCopy("copy.app.site.business.page");
  const copy = await pageCopy("business");
  const spaces = (await Promise.all(BIZ_SPACES.map(getPublicVenue))).filter((space) => space !== null);

  return (
    <main>
      <PageHero
        eyebrow={copy("eyebrow.business-mice", "Business & MICE")}
        title={copy("title.business-events-run-with-operational-precision", "Business Events, Run With Operational Precision.")}
        intro={copy("intro.conferences-exhibitions-launches-and-leadership-ga", "Conferences, exhibitions, launches and leadership gatherings — clear capacities, AV readiness, parking and access planned as carefully as the programme.")}
        image={copy("image.hero-image-business-page-vijaya-vicc-webp", "/media/Hero Image-Business Page-Vijaya-VICC.webp")}
        imageAlt={cmsCopy("imageAlt.vijaya-international-convention-centre-busine", "VIJAYA International Convention Centre business conference room")}
        overlayClassName="bg-gradient-to-r from-ink/85 via-ink/45 to-transparent"
        quality={95}
        tag={false}
        ctas={[
          { label: "Request a Quote", href: "/plan-your-event?eventType=BUSINESS" },
          { label: "Book a Venue Visit", href: "/venue-visit?eventType=BUSINESS", variant: "ghost" },
        ]}
      />

      {/* FORMATS */}
      <section className="py-20 md:py-28">
        <div className="container-editorial">
          <Reveal>
            <p className="eyebrow-dark">{copy("text.formats", "Formats")}</p>
            <h2 className="h-section mt-3 max-w-2xl">{copy("text.every-business-format-one-address", "Every Business Format, One Address")}</h2>
          </Reveal>
          <div className="mt-12 grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3 border border-border">
            {FORMATS.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05} className="bg-ivory">
                <div className="p-8 h-full">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-gold">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-3 text-lg font-medium">{f.title}</h3>
                  <p className="mt-2 text-[13px] font-light leading-6 text-stone">{f.copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SPACES */}
      <section className="bg-ivory-deep py-20 md:py-28">
        <div className="container-editorial">
          <Reveal>
            <p className="eyebrow-dark">{copy("text.corporate-spaces", "Corporate Spaces")}</p>
            <h2 className="h-section mt-3">{copy("text.halls-rooms-for-business", "Halls & Rooms for Business")}</h2>
            <p className="text-[12px] text-stone mt-3">{copy("text.capacities-shown-are-indicative-pending-verified-m", "Capacities shown are indicative pending verified master data.")}</p>
          </Reveal>
          <div className="mt-12 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {spaces.map((s, i) => (
              <VenueCard key={s.slug} space={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CAPACITY CONFIGURATIONS */}
      <section className="py-20 md:py-28">
        <div className="container-editorial grid gap-12 lg:grid-cols-2 lg:items-start">
          <Reveal>
            <p className="eyebrow-dark">{copy("text.capacity-configurations", "Capacity Configurations")}</p>
            <h2 className="h-section mt-3">{copy("text.layouts-that-match-the-agenda", "Layouts That Match the Agenda")}</h2>
            <p className="lede mt-4">{copy("text.exact-verified-capacities-are-being-finalised-by-v", "Exact verified capacities are being finalised by VICC management. The table below shows the layouts each hall supports — numbers are published once approved.")}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="overflow-x-auto card-editorial">
              <table className="w-full text-sm">
                <caption className="sr-only">{copy("text.layout-support-by-space", "Layout support by space")}</caption>
                <thead>
                  <tr className="hairline-b text-left">
                    <th className="px-5 py-4 font-medium">{copy("text.space", "Space")}</th>
                    <th className="px-5 py-4 font-medium">{copy("text.layouts-supported", "Layouts supported")}</th>
                    <th className="px-5 py-4 font-medium">{copy("text.capacity", "Capacity")}</th>
                  </tr>
                </thead>
                <tbody>
                  {spaces.map((s) => (
                    <tr key={s.slug} className="hairline-b last:border-0">
                      <td className="px-5 py-4 font-medium whitespace-nowrap">{s.officialName}</td>
                      <td className="px-5 py-4 text-stone">{s.seatingLayouts.join(", ") || "—"}</td>
                      <td className="px-5 py-4 text-stone whitespace-nowrap">{s.guestRange ? `${s.guestRange[0]}–${s.guestRange[1]}` : "TBC"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* AV + BRANDING + ACCESS */}
      <section className="bg-ink text-ivory py-20 md:py-28">
        <div className="container-editorial grid gap-10 md:grid-cols-3">
          {[
            {
              title: "AV Facilities",
              items: ["Professional PA systems", "Wireless microphones", "Projection / LED-wall readiness", "Recording-friendly stage lighting"],
            },
            {
              title: "Branding Opportunities",
              items: ["Stage backdrops and facades", "Foyer and arrival branding", "Entrance arches and gateways", "Digital screen placements"],
            },
            {
              title: "Parking & Access",
              items: ["Extensive on-site parking", "Dedicated service gates", "Load-in corridors for production", "VIP arrival routes"],
            },
          ].map((b, i) => (
            <Reveal key={b.title} delay={i * 0.08}>
              <div className="hairline-t-light pt-8">
                <h3 className="text-lg font-medium">{b.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {b.items.map((it) => (
                    <li key={it} className="flex items-start gap-2.5 text-[13px] font-light text-ivory/70">
                      <span className="mt-[7px] h-1 w-1 rounded-full bg-gold shrink-0" aria-hidden />
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* FLOOR PLANS */}
      <section className="py-20 md:py-28">
        <div className="container-editorial grid gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow-dark">{copy("text.floor-plans", "Floor Plans")}</p>
            <h2 className="h-section mt-3">{copy("text.plan-your-layout-before-load-in", "Plan Your Layout Before Load-In")}</h2>
            <p className="lede mt-4">{copy("text.verified-floor-plans-and-dimensional-drawings-are", "Verified floor plans and dimensional drawings are being surveyed and will be published per hall. In the meantime, our events team will share the current plan for your dates at quotation.")}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/plan-your-event?eventType=BUSINESS" className="btn-primary"><span>{copy("text.request-a-quote", "Request a Quote")}</span></Link>
              <Link href="/spaces" className="btn-outline"><span>{copy("text.explore-spaces", "Explore Spaces")}</span><ArrowRight className="h-4 w-4" /></Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-[12px] text-stone">
              <MapPin className="h-3.5 w-3.5" />{copy("text.thiruvalla-pathanamthitta-convenient-to-kottayam-a", " Thiruvalla, Pathanamthitta — convenient to Kottayam and the GCC corridor towns.")}</p>
          </Reveal>
          <MaskRevealWrapper />
        </div>
      </section>
    </main>
  );
}

async function MaskRevealWrapper() {
  const cmsCopy = await getComponentCopy("copy.app.site.business.page");
  return (
    <Reveal delay={0.1}>
      <div className="relative aspect-[4/3] card-editorial overflow-hidden flex items-center justify-center bg-sand/20">
        <div className="absolute inset-0 opacity-60">
          <Media src={cmsCopy("src.media-space-boardroom-jpg", "/media/space-boardroom.jpg")} alt={cmsCopy("alt.floor-plan-placeholder-vijaya-boardroom", "Floor plan placeholder — VIJAYA boardroom")} sizes="(max-width: 1024px) 100vw, 50vw" tag={false} />
        </div>
        <div className="relative text-center px-6 py-10 bg-ivory/85 border border-border m-8">
          <Download className="h-5 w-5 text-gold mx-auto" aria-hidden />
          <p className="mt-3 text-sm font-medium">{cmsCopy("text.floor-plan-pack", "Floor plan pack")}</p>
          <p className="mt-1 text-[12px] text-stone">{cmsCopy("text.published-after-verified-survey-approval", "Published after verified survey approval")}</p>
        </div>
      </div>
    </Reveal>
  );
}

export const generateMetadata = () => pageMetadata("business", metadata);
