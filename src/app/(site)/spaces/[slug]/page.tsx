import { pageMetadata, siteContent } from "@/lib/content";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight, AudioLines, Car, Check, DoorOpen, HeartHandshake, Lightbulb,
  Maximize, PersonStanding, Ruler, Sparkles, Toilet, Users2, Video,
} from "lucide-react";
import { SPACES, SPACE_BY_SLUG, COMBO_RULES } from "@/lib/data/spaces";
import { getPublicVenue } from "@/lib/venue-content";
import { inr } from "@/lib/pricing";
import { SLOTS, SHOW_VIRTUAL_TOUR } from "@/lib/site-config";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal, MaskReveal } from "@/components/motion/reveal";
import { Media } from "@/components/media/media";
import { SpaceGallery } from "@/components/spaces/space-gallery";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { SpaceAvailabilityWidget } from "@/components/booking/space-availability-widget";
import { StickySpaceCTA } from "@/components/booking/sticky-space-cta";

export function generateStaticParams() {
  return SPACES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const space = await getPublicVenue(slug);
  if (!space) return {};
  return pageMetadata(`spaces.${slug}`, {
    title: space.officialName, description: space.shortDescription,
    openGraph: { images: [{ url: space.heroImage }] },
  });
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="hairline-t pt-4">
      <p className="label-vij !mb-1">{label}</p>
      <p className="text-[14px] font-light text-ink">{value}</p>
    </div>
  );
}

function FeatureList({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Reveal>
      <div className="hairline-t pt-6">
        <h3 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em] text-ink">
          <span className="text-gold">{icon}</span> {title}
        </h3>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it} className="flex items-start gap-2 text-[13px] font-light text-stone">
              <Check className="h-3.5 w-3.5 mt-0.5 text-gold shrink-0" aria-hidden /> {it}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

export default async function SpaceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const showVirtualTour = (await siteContent("site.settings"))?.showVirtualTour ?? SHOW_VIRTUAL_TOUR;
  const space = await getPublicVenue(slug);
  if (!space) notFound();

  const combo = COMBO_RULES.find((c) => c.active && (c.comboSlug === slug || c.childSlugs.includes(slug)));
  const relatedSpaces = space.relatedSpaces.map((r) => SPACE_BY_SLUG[r]).filter(Boolean).slice(0, 3);

  return (
    <main className="pb-24">
      <PageHero
        eyebrow={`${space.indoorOrOutdoor === "INDOOR" ? "Indoor" : "Outdoor"} · ${space.venueCategory === "MULTI" ? "Multi-occasion" : space.venueCategory.toLowerCase()}`}
        title={space.officialName}
        intro={space.shortDescription}
        image={space.heroImage}
        imageAlt={space.heroImageAlt}
        quality={space.heroImageQuality}
        tag={space.heroTag}
        overlayClassName={space.heroOverlayClassName}
        height="mid"
      />

      {/* INTRO + KEY FACTS */}
      <section className="py-16 md:py-24">
        <div className="container-editorial">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Spaces", href: "/spaces" }, { label: space.officialName }]} />
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
            <Reveal>
              <p className="eyebrow-dark">The Space</p>
              <h2 className="h-sub mt-3">A setting composed around your occasion.</h2>
              <p className="mt-5 text-[15px] font-light leading-8 text-stone">{space.longDescription}</p>
              {combo && (
                <p className="mt-5 border-l-2 border-gold pl-4 text-[13px] font-light leading-7 text-stone">
                  <strong className="font-medium text-ink">Combination ready:</strong> {combo.comboName} — this hall can
                  function together with {combo.childSlugs.filter((c) => c !== slug).map((c) => SPACE_BY_SLUG[c]?.officialName).join(" + ")} as one
                  combined space. If either hall is booked, the combined configuration is automatically unavailable.
                </p>
              )}
            </Reveal>
            <Reveal delay={0.1}>
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <Fact label="Setting" value={space.indoorOrOutdoor === "INDOOR" ? "Indoor" : "Outdoor"} />
                <Fact label="Guest range" value={space.guestRange ? `${space.guestRange[0]}–${space.guestRange[1]} (indicative)` : "To be confirmed"} />
                <Fact label="Dimensions" value={space.dimensions || "To be confirmed"} />
                <Fact label="Floor area" value={space.floorArea || "To be confirmed"} />
                <Fact label="Ceiling height" value={space.ceilingHeight || "To be confirmed"} />
                <Fact label="Best for" value={space.idealEventTypes.slice(0, 2).join(", ")} />
              </div>
              <p className="mt-6 text-[11px] uppercase tracking-[0.16em] text-stone/70 leading-5">
                Provisional master data — verified capacities and dimensions are published once approved by VICC.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CAPACITY BY LAYOUT */}
      <section className="bg-ivory-deep py-16 md:py-20">
        <div className="container-editorial">
          <Reveal>
            <p className="eyebrow-dark">Capacity &amp; Layouts</p>
            <h2 className="h-section mt-3">Seated, Floating, Staged — Your Way</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(space.capacityByLayout.length > 0 ? space.capacityByLayout : [{ layout: "Flexible", count: null }]).map((l, i) => (
              <Reveal key={l.layout} delay={i * 0.06}>
                <div className="card-editorial p-6">
                  <Users2 className="h-5 w-5 text-gold" aria-hidden />
                  <h3 className="mt-4 text-[15px] font-medium">{l.layout}</h3>
                  <p className="mt-1 text-[13px] text-stone">{l.count ? `${l.count} guests` : "Capacity to be confirmed"}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FACILITIES */}
      <section className="py-16 md:py-24">
        <div className="container-editorial grid gap-10 lg:grid-cols-2">
          <div className="space-y-8">
            <FeatureList title="AV facilities" icon={<AudioLines className="h-4 w-4" />} items={space.avFacilities} />
            <FeatureList title="Lighting" icon={<Lightbulb className="h-4 w-4" />} items={space.lightingFacilities} />
            <FeatureList title="Stage" icon={<Sparkles className="h-4 w-4" />} items={space.stageDetails} />
            <FeatureList title="VIP facilities" icon={<HeartHandshake className="h-4 w-4" />} items={space.vipFacilities} />
          </div>
          <div className="space-y-8">
            <Reveal>
              <div className="hairline-t pt-6">
                <h3 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]"><Ruler className="h-4 w-4 text-gold" /> Green rooms</h3>
                <p className="mt-3 text-[13px] font-light leading-7 text-stone">{space.greenRooms}</p>
              </div>
            </Reveal>
            <Reveal delay={0.05}>
              <div className="hairline-t pt-6 grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]"><DoorOpen className="h-4 w-4 text-gold" /> Guest entry</h3>
                  <p className="mt-3 text-[13px] font-light leading-7 text-stone">{space.guestEntry}</p>
                </div>
                <div>
                  <h3 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]"><DoorOpen className="h-4 w-4 text-gold" /> Service entry</h3>
                  <p className="mt-3 text-[13px] font-light leading-7 text-stone">{space.serviceEntry}</p>
                </div>
                <div>
                  <h3 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]"><Car className="h-4 w-4 text-gold" /> Parking</h3>
                  <p className="mt-3 text-[13px] font-light leading-7 text-stone">{space.parkingNotes}</p>
                </div>
                <div>
                  <h3 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]"><PersonStanding className="h-4 w-4 text-gold" /> Accessibility</h3>
                  <p className="mt-3 text-[13px] font-light leading-7 text-stone">{space.accessibility}</p>
                </div>
                <div>
                  <h3 className="flex items-center gap-2.5 text-[13px] font-medium uppercase tracking-[0.18em]"><Toilet className="h-4 w-4 text-gold" /> Restrooms</h3>
                  <p className="mt-3 text-[13px] font-light leading-7 text-stone">{space.restrooms}</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FLOOR PLAN */}
      <section className="bg-ivory-deep py-16 md:py-20">
        <div className="container-editorial grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="eyebrow-dark">Floor Plan</p>
            <h2 className="h-section mt-3">The Layout, Before Load-In</h2>
            <p className="lede mt-4">
              {space.floorPlan
                ? "Review the hall plan and share it with your decorators and production team."
                : "Verified floor plans are being surveyed and will be published for each hall. Our events team will share the current plan for your dates at quotation."}
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative aspect-[4/3] card-editorial flex items-center justify-center bg-sand/25">
              {space.floorPlan ? (
                <Media src={space.floorPlan} alt={`${space.officialName} floor plan`} sizes="50vw" tag={false} />
              ) : (
                <div className="text-center px-8 py-10">
                  <Ruler className="h-6 w-6 text-gold mx-auto" aria-hidden />
                  <p className="mt-4 text-sm font-medium">Floor plan — after verified survey approval</p>
                  <p className="mt-1 text-[12px] text-stone">Ask the events team for the working plan for your dates</p>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* GALLERY */}
      <section className="py-16 md:py-24">
        <div className="container-editorial">
          <Reveal>
            <p className="eyebrow-dark">Gallery</p>
            <h2 className="h-section mt-3">{space.officialName}, Viewed Closely</h2>
          </Reveal>
          {space.galleryAlts ? (
            <SpaceGallery
              images={space.gallery}
              alts={space.galleryAlts}
              quality={space.galleryQuality ?? 92}
              layout={space.galleryLayout ?? "symmetric"}
              lightbox={space.galleryLightbox ?? false}
            />
          ) : (
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {space.gallery.map((g, i) => (
                <MaskReveal key={g + i} className={`relative aspect-[4/3] ${i === 0 ? "md:col-span-2 md:aspect-[8/3]" : ""}`} delay={i * 0.06}>
                  <Media src={g} alt={`${space.officialName} gallery image ${i + 1} — placeholder visual`} sizes="(max-width: 768px) 100vw, 50vw" />
                </MaskReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* VIDEO + 360 — the 360° column is hidden while showVirtualTour is false;
          the grid collapses to a single column so no empty gap remains. */}
      <section className="bg-ink text-ivory py-16 md:py-24">
        <div className={`container-editorial grid gap-10 ${showVirtualTour ? "lg:grid-cols-2" : ""}`}>
          <Reveal>
            <div className="relative aspect-video border border-ivory/10 flex items-center justify-center bg-sand/5">
              <div className="text-center px-6">
                <Video className="h-7 w-7 text-gold mx-auto" aria-hidden />
                <p className="mt-4 text-sm text-ivory/60 font-light">{space.officialName} film — awaiting official VIJAYA media</p>
              </div>
            </div>
            <h3 className="mt-5 text-lg font-normal">Film &amp; Showreel</h3>
          </Reveal>
          {showVirtualTour && (
          <Reveal delay={0.1}>
            <div className="relative aspect-video border border-ivory/10 overflow-hidden">
              {space.scenes360.length > 0 ? (
                <Media src={`/media/${space.scenes360[0]}.jpg`} alt={`${space.officialName} 360 preview — placeholder`} sizes="50vw" tag={false} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-ivory/50 text-sm">360 not available for this space</div>
              )}
              <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
                <Link href="/360-tour" className="btn-gold"><Maximize className="h-4 w-4" /><span>Open 360° Experience</span></Link>
              </div>
            </div>
            <h3 className="mt-5 text-lg font-normal">360° Experience</h3>
          </Reveal>
          )}
        </div>
      </section>

      {/* AVAILABILITY + PRICING */}
      <section id="availability" className="bg-ivory-deep py-16 md:py-24 scroll-mt-20">
        <div className="container-editorial grid gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow-dark">Availability</p>
            <h2 className="h-section mt-3">Is Your Date Free?</h2>
            <p className="lede mt-4">
              Validated server-side and synchronised with the VIJAYA booking office — offline bookings block online
              instantly.
            </p>
            <div className="mt-8">
              <SpaceAvailabilityWidget slug={space.slug} />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="eyebrow-dark">Pricing</p>
            <h2 className="h-section mt-3">Indicative Rates</h2>
            <div className="mt-6 card-editorial divide-y divide-border">
              {SLOTS.map((s) => {
                const p = space.pricing[s.id];
                return (
                  <div key={s.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="text-[14px] font-medium">{s.label}</p>
                      <p className="text-[12px] text-stone">{s.time}</p>
                    </div>
                    <p className="text-[14px] font-light">{p ? inr(p) : "On request"}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[12px] leading-6 text-stone">
              Sample rates pending VIJAYA approval. Taxes, deposit terms and seasonal rules are confirmed at
              quotation — no hidden charges appear at checkout.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href={`/check-your-date?venue=${space.slug}`} className="btn-primary"><span>Book This Space</span></Link>
              <Link href={`/venue-visit?venue=${space.slug}`} className="btn-outline"><span>Book Venue Visit</span></Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* RELATED SPACES */}
      {relatedSpaces.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container-editorial">
            <Reveal className="flex items-end justify-between gap-6">
              <h2 className="h-section">Also Consider</h2>
              <Link href="/spaces" className="link-underline text-[13px] uppercase tracking-[0.18em] inline-flex items-center gap-2">
                All spaces <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {relatedSpaces.map((s, i) => (
                <Reveal key={s.slug} delay={i * 0.06}>
                  <Link href={`/spaces/${s.slug}`} className="group block">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <Media src={s.heroImage} alt={s.heroImageAlt ?? `${s.officialName} — placeholder visual`} className="transition-transform duration-[1.2s] group-hover:scale-105" sizes="33vw" quality={s.heroImageQuality ?? 75} tag={s.heroTag !== false} />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
                      <h3 className="absolute bottom-4 left-4 text-lg font-normal text-ivory">{s.officialName}</h3>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <StickySpaceCTA slug={space.slug} name={space.officialName} />
    </main>
  );
}
