
import { getComponentCopy } from "@/lib/cms/read";
import { pageCopy, pageMetadata, siteContent } from "@/lib/content";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChevronDown, Globe2, Maximize } from "lucide-react";
import { getPublicVenues } from "@/lib/venue-content";
import { HOME_HERO, HOME_OCCASIONS } from "@/lib/cms/site-defaults";
import { DESTINATION_BLOCKS } from "@/lib/data/content";
import { Media } from "@/components/media/media";
import { HeroBackground } from "@/components/media/hero-background";
import { Reveal, HeroText, Parallax } from "@/components/motion/reveal";
import { VenueCard } from "@/components/booking/venue-card";
import { QuickDateForm } from "@/components/booking/quick-date-form";
import { TrackLink } from "@/components/seo/track-link";
import { HeroCheckDate } from "@/components/booking/hero-check-date";
import { SHOW_VIRTUAL_TOUR } from "@/lib/site-config";

const metadata: Metadata = {
  title: "VIJAYA International Convention Centre — A Frame for Possibilities",
  description:
    "A premium destination for weddings, celebrations and business events in Thiruvalla, Kerala. Explore the halls, check your date and plan your occasion.",
};

export default async function HomePage() {
  const cmsCopy = await getComponentCopy("copy.app.site.page");
  const [copy, hero, settings] = await Promise.all([pageCopy("home"), siteContent("home.hero"), siteContent("site.settings")]);
  const showVirtualTour = settings?.showVirtualTour ?? SHOW_VIRTUAL_TOUR;
  const occasions = (await siteContent("home.occasions")) ?? HOME_OCCASIONS;
  const destinations = (await siteContent("home.destinations")) ?? DESTINATION_BLOCKS;
  const featuredSpaces = (await getPublicVenues()).filter((s) => s.bookableOnline).slice(0, 6);

  return (
    <main>
      {/* ---------------------------------------------------------- HERO */}
      <section className="relative h-[100svh] min-h-[620px] overflow-hidden bg-ink" aria-label={copy("aria-label.vijaya-welcome", "VIJAYA — welcome")}>
        <HeroBackground
          sourceType="selfHosted"
          selfHostedSources={{
            mp4: hero?.desktop ?? HOME_HERO.desktop,
            mp4Mobile: hero?.mobile ?? HOME_HERO.mobile,
          }}
          posterImage={hero?.poster ?? copy("posterImage.hero-video-poster-jpg", "/media/hero-video-poster.jpg")}
          posterAlt={hero?.posterAlt ?? copy("posterAlt.vijaya-hero-video-opening-frame", "VIJAYA hero video — opening frame")}
          overlayClassName="absolute inset-0 vignette"
          bottomFadeClassName="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink/80 to-transparent"
        />

        <div className="relative z-10 container-editorial h-full flex flex-col justify-end pb-24 md:pb-28">
          <HeroText
            lines={[
              <p key="eyebrow" className="eyebrow">{hero?.eyebrow ?? HOME_HERO.eyebrow}</p>,
              <h1 key="h1" className="h-hero text-ivory mt-5 max-w-5xl">
                {hero?.heading ?? <>{cmsCopy("text.every-great-occasion-deserves-a-grand-address", "Every Great Occasion Deserves a Grand Address.")}</>}
              </h1>,
            ]}
          />
          <Reveal delay={0.7}>
            <p className="lede !text-ivory/70 mt-6 max-w-xl">
              {hero?.intro ?? HOME_HERO.intro}
            </p>
          </Reveal>
          <Reveal delay={0.85}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <HeroCheckDate label={hero?.cta?.label} href={hero?.cta?.href} />
              <Link href="/about" className="btn-outline-light">
                <span>{copy("text.explore-vijaya", "Explore VIJAYA")}</span>
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-2 text-ivory/60">
          <span className="text-[10px] uppercase tracking-[0.3em]">{copy("text.scroll", "Scroll")}</span>
          <ChevronDown className="scroll-cue h-4 w-4" />
        </div>
      </section>

      {/* ---------------------------------------------- EVENT SELECTOR */}
      <section className="py-20 md:py-28" aria-labelledby="planning">
        <div className="container-editorial">
          <Reveal>
            <p className="eyebrow-dark">{copy("text.begin-here", "Begin Here")}</p>
            <h2 id="planning" className="h-section mt-3 max-w-2xl">{copy("text.what-are-you-planning", "What Are You Planning?")}</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {occasions.map((p, i) => (
              <Reveal key={p.href} delay={i * 0.1}>
                <TrackLink href={p.href} event="event_type_selected" meta={{ type: p.title }} className="group relative block aspect-[3/4] overflow-hidden">
                  <Media src={p.img} alt={p.alt} tag={false} className="object-center transition-transform duration-[1.6s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]" sizes="(max-width: 768px) 100vw, 33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-7">
                    <h3 className="text-2xl font-light text-ivory">{p.title}</h3>
                    <p className="mt-2 max-w-[26ch] text-[13px] font-light leading-6 text-ivory/70">{p.copy}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-gold">{copy("text.discover", "Discover ")}<ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </span>
                  </div>
                </TrackLink>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- BRAND STORY */}
      <section className="bg-burgundy text-ivory py-20 md:py-28 overflow-hidden" aria-labelledby="story">
        <div className="container-editorial grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <Reveal>
              <p className="eyebrow">{copy("text.more-than-a-venue", "More Than a Venue")}</p>
              <h2 id="story" className="h-display mt-4">{copy("text.a-destination-built-around-possibility", "A Destination Built Around Possibility.")}</h2>
              <p className="lede !text-ivory/70 mt-6">{copy("text.vijaya-is-a-connected-destination-indoor-halls-out", "VIJAYA is a connected destination — indoor halls, outdoor grounds, a quiet lake, hospitality facilities and guest experiences designed as one composition. The frame defines the space. The V defines the identity. Together, they frame endless possibilities.")}</p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-9 flex flex-wrap gap-4">
                <Link href="/experiences" className="btn-outline-light"><span>{copy("text.explore-the-destination", "Explore the Destination")}</span></Link>
                <Link href="/spaces" className="btn-gold"><span>{copy("text.view-our-spaces", "View Our Spaces")}</span></Link>
              </div>
            </Reveal>
          </div>
          <Parallax strength={40} className="relative aspect-[4/3] overflow-hidden">
            <Media src={copy("src.image-webp", "/media/Image-.webp")} alt={copy("alt.exterior-of-vijaya-international-convention-centre", "Exterior of VIJAYA International Convention Centre with landscaped grounds and fountain")} tag={false} sizes="(max-width: 1024px) 100vw, 50vw" />
          </Parallax>
        </div>
      </section>

      {/* ---------------------------------------------- SPACES PREVIEW */}
      <section className="py-20 md:py-28" aria-labelledby="spaces">
        <div className="container-editorial">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow-dark">{copy("text.the-collection", "The Collection")}</p>
              <h2 id="spaces" className="h-section mt-3">{copy("text.explore-our-spaces", "Explore Our Spaces")}</h2>
              <p className="lede mt-4 max-w-xl">{copy("text.discover-settings-designed-for-occasions-of-every", "Discover settings designed for occasions of every scale — capacities shown are indicative pending verified master data.")}</p>
            </div>
            <Link href="/spaces" className="link-underline text-[13px] uppercase tracking-[0.18em] text-ink inline-flex items-center gap-2">{copy("text.all-spaces", "All spaces ")}<ArrowRight className="h-4 w-4" />
            </Link>
          </Reveal>
          <div className="mt-12 grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {featuredSpaces.map((s, i) => (
              <VenueCard key={s.slug} space={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- 360 TEASER
          Hidden while SHOW_VIRTUAL_TOUR is false. The section is retained
          internally so it can be re-enabled by flipping the flag in
          src/lib/site-config.ts. */}
      {showVirtualTour && (
      <section className="relative overflow-hidden bg-ink text-ivory" aria-labelledby="teaser360">
        <div className="absolute inset-0 opacity-40">
          <Media src={copy("src.step-inside-experience-vijaya-360-section-home-pag", "/media/Step inside- Experience VIJAYA 360 Section-Home Page-Vijaya-VICC.webp")} alt={copy("alt.vijaya-international-convention-centre-exterior-wi", "VIJAYA International Convention Centre exterior with landscaped gardens and fountain")} tag={false} sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-ink/20" />
        </div>
        <div className="relative container-editorial py-24 md:py-36">
          <Reveal className="max-w-xl">
            <p className="eyebrow">{copy("text.step-inside", "Step Inside")}</p>
            <h2 id="teaser360" className="h-display mt-4">{copy("text.experience-vijaya-in-360", "Experience VIJAYA in 360°.")}</h2>
            <p className="lede !text-ivory/70 mt-5">{copy("text.walk-the-halls-and-the-lakeside-from-anywhere-in-t", "Walk the halls and the lakeside from anywhere in the world — drag, zoom and move between spaces before you ever make the journey.")}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <TrackLink href="/360-tour" event="venue_360_started" meta={{ source: "homepage_teaser" }} className="btn-gold">
                <Maximize className="h-4 w-4" />
                <span>{copy("text.enter-360-experience", "Enter 360° Experience")}</span>
              </TrackLink>
            </div>
          </Reveal>
        </div>
      </section>
      )}

      {/* --------------------------------------------- CHECK DATE MODULE */}
      <section className="bg-burgundy-deep text-ivory py-20 md:py-28" aria-labelledby="checkdate">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{copy("text.plan-with-confidence", "Plan With Confidence")}</p>
            <h2 id="checkdate" className="h-display mt-4">{copy("text.check-your-date", "Check Your Date.")}</h2>
            <p className="lede !text-ivory/70 mt-4">{copy("text.live-availability-across-every-bookable-space-the", "Live availability across every bookable space — the same calendar the VIJAYA booking office uses.")}</p>
          </Reveal>
          <Reveal delay={0.15} className="mt-10">
            <QuickDateForm />
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------- DESTINATION */}
      <section className="py-20 md:py-28" aria-labelledby="destination">
        <div className="container-editorial">
          <Reveal>
            <p className="eyebrow-dark">{copy("text.the-destination", "The Destination")}</p>
            <h2 id="destination" className="h-section mt-3 max-w-xl">{copy("text.beyond-the-halls", "Beyond the Halls")}</h2>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {destinations.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 0.08}>
                <Link href={b.href} className="group relative block aspect-[4/3] overflow-hidden">
                  <Media src={b.image} alt={`${b.title} at VIJAYA International Convention Centre`} className="transition-transform duration-[1.4s] group-hover:scale-105" sizes="(max-width: 768px) 50vw, 33vw" quality={95} tag={false} />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent opacity-70 transition-opacity group-hover:opacity-90" />
                  <p className="absolute bottom-3 left-4 text-[13px] uppercase tracking-[0.18em] text-ivory">{b.title}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- FINAL CTA */}
      <section className="relative overflow-hidden bg-ink text-ivory" aria-labelledby="finalcta">
        <div className="absolute inset-0 opacity-50">
          <Media src={copy("src.your-occassion-starts-here-home-page-vijaya-vicc-w", "/media/Your Occassion Starts Here-Home Page-Vijaya-VICC.webp")} alt={copy("alt.illuminated-exterior-of-vijaya-international-conve", "Illuminated exterior of VIJAYA International Convention Centre")} tag={false} sizes="100vw" />
          <div className="absolute inset-0 vignette" />
        </div>
        <div className="relative container-editorial py-24 md:py-36 text-center">
          <Reveal>
            <Globe2 className="h-6 w-6 text-gold mx-auto" aria-hidden />
            <h2 id="finalcta" className="h-display mt-6">{copy("text.your-occasion-starts-here", "Your Occasion Starts Here.")}</h2>
            <p className="lede !text-ivory/70 mt-4 mx-auto max-w-lg">
              {showVirtualTour
                ? "Check your date, walk the destination in 360°, or begin with a conversation — however you start, we make it simple."
                : "Check your date, or begin with a conversation — however you start, we make it simple."}
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <TrackLink href="/check-your-date" event="hero_check_date_click" meta={{ source: "final_cta" }} className="btn-gold">
                <span>{copy("text.check-your-date-2", "Check Your Date")}</span>
              </TrackLink>
              <Link href="/venue-visit" className="btn-outline-light"><span>{copy("text.book-a-venue-tour", "Book a Venue Tour")}</span></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

export const generateMetadata = () => pageMetadata("home", metadata);
