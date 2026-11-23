import { PublishedCollections } from "@/components/layout/published-collections";
import { pageCopy, pageMetadata } from "@/lib/content";
import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal, Parallax } from "@/components/motion/reveal";
import { Media } from "@/components/media/media";
import { SITE } from "@/lib/site-config";
import { Logo } from "@/components/brand/logo";

const metadata: Metadata = {
  title: "About VIJAYA",
  description:
    "The story of VIJAYA International Convention Centre — a frame for possibilities, rooted in Thiruvalla, Kerala.",
};

export default async function AboutPage() {
  const copy = await pageCopy("about");
  return (
    <main className="pb-24">
      <PageHero
        eyebrow={copy("eyebrow.about", "About")}
        title={copy("title.a-frame-for-possibilities", "A Frame for Possibilities.")}
        intro={copy("intro.the-frame-defines-the-space-the-v-defines-the-iden", "The frame defines the space. The V defines the identity. Together, they frame endless possibilities.")}
        image={copy("image.about-hero-jpg", "/media/about-hero.jpg")}
      />

      <section className="py-16 md:py-24">
        <div className="container-editorial grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <p className="eyebrow-dark">{copy("text.the-idea", "The Idea")}</p>
            <h2 className="h-section mt-3">{copy("text.more-than-a-venue-a-destination-built-around-possi", "More Than a Venue — a Destination Built Around Possibility.")}</h2>
            <div className="mt-6 space-y-5 text-[15px] font-light leading-8 text-stone">
              <p>{copy("text.vijaya-international-convention-centre-began-with", "VIJAYA International Convention Centre began with a simple conviction: Kerala's great occasions deserve a great address. Not a hall rented by the hour, but a destination composed end to end — architecture, landscape, water, light and hospitality designed as one continuous experience.")}</p>
              <p>{copy("text.the-name-carries-the-ambition-of-the-place-named-h", "The name carries the ambition of the place. Named halls echo Kerala's rivers — Periyar, Nila, Pamba, Kabani — each with its own character, each capable of standing alone or flowing together. From an intimate lakeside ceremony to a conference of a thousand delegates, the destination adapts to the occasion rather than the reverse.")}</p>
              <p>{copy("text.we-are-rooted-in-thiruvalla-in-the-heart-of-pathan", "We are rooted in Thiruvalla, in the heart of Pathanamthitta, within easy reach of Kottayam and the towns that send families across the world. For the global Keralite, VIJAYA is designed as a homecoming: every planning step possible from abroad, every arrival worth the journey.")}</p>
            </div>
          </Reveal>
          <Parallax strength={36} className="relative aspect-[3/4] overflow-hidden">
            <Media src={copy("src.exp-architecture-jpg", "/media/exp-architecture.jpg")} alt={copy("alt.vijaya-architecture-placeholder-visual", "VIJAYA architecture — placeholder visual")} sizes="(max-width: 1024px) 100vw, 40vw" />
          </Parallax>
        </div>
      </section>

      <section className="bg-burgundy text-ivory py-16 md:py-24">
        <div className="container-editorial grid gap-10 md:grid-cols-3">
          {[
            { t: "Grand", d: "Scale that uplifts without overwhelming — halls, grounds and light composed for big days." },
            { t: "Warm", d: "Kerala-rooted hospitality: unhurried, genuine, attentive to the rituals that matter." },
            { t: "Precise", d: "Operationally exact — synchronised calendars, clear pricing, teams that anticipate." },
          ].map((v, i) => (
            <Reveal key={v.t} delay={i * 0.08}>
              <div className="hairline-t-light pt-7">
                <h3 className="text-xl font-light">{v.t}</h3>
                <p className="mt-3 text-[14px] font-light leading-7 text-ivory/70">{v.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-editorial max-w-3xl">
          <Reveal>
            <p className="eyebrow-dark">{copy("text.the-mark", "The Mark")}</p>
            <h2 className="h-section mt-3">{copy("text.the-v-and-the-frame", "The V and the Frame.")}</h2>
            <p className="lede mt-4">{copy("text.the-vijaya-monogram-places-a-rising-v-inside-a-squ", "The VIJAYA monogram places a rising V inside a square frame — a mark of definition and openness at once. It appears unchanged across this platform, exactly as designed.")}</p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card-editorial p-8 flex items-center justify-center bg-white">
                <Logo variant="burgundy" size="showcase" ariaLabel="VIJAYA logo — burgundy variant" />
              </div>
              <div className="card-editorial p-8 flex items-center justify-center bg-ink">
                <Logo variant="gold" size="showcase" ariaLabel="VIJAYA logo — gold variant" />
              </div>
              <div className="card-editorial p-8 flex items-center justify-center bg-ink">
                <Logo variant="white" size="showcase" ariaLabel="VIJAYA logo — white variant" />
              </div>
            </div>
          </Reveal>
          <Reveal className="mt-12">
            <p className="text-[12px] leading-6 text-stone/80 border-l-2 border-sand pl-4">{copy("text.brand-note", "Brand note: ")}{SITE.officialName}{copy("text.is-also-known-by-its-legacy-abbreviation", " is also known by its legacy abbreviation ")}{SITE.legacyName}{copy("text.the-uploaded-logo-assets-are-used-exactly-as-suppl", ". The uploaded logo assets are used exactly as supplied, without redrawing, restretching or recolouring.")}</p>
          </Reveal>
        </div>
      </section>
      <PublishedCollections />
    </main>
  );
}

export const generateMetadata = () => pageMetadata("about", metadata);
