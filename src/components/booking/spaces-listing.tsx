"use client";
import { useCmsCopy } from "@/lib/cms/client";


import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, SearchX } from "lucide-react";
import { SPACES, type SpaceRecord } from "@/lib/data/spaces";
import { Media } from "@/components/media/media";
import { Reveal } from "@/components/motion/reveal";
import { track } from "@/lib/analytics";

type SettingFilter = "ALL" | "INDOOR" | "OUTDOOR";
type OccasionFilter = "ALL" | "WEDDING" | "BUSINESS" | "CELEBRATION";

export function SpacesListing({ spaces = SPACES }: { spaces?: SpaceRecord[] } = {}) {
  const cmsCopy = useCmsCopy("copy.components.booking.spaces-listing");
  const [setting, setSetting] = useState<SettingFilter>("ALL");
  const [occasion, setOccasion] = useState<OccasionFilter>("ALL");
  const [guests, setGuests] = useState("");

  const filtered = useMemo(() => {
    return spaces.filter((s) => {
      if (setting !== "ALL" && s.indoorOrOutdoor !== setting) return false;
      if (occasion !== "ALL" && s.venueCategory !== "MULTI" && s.venueCategory !== occasion) return false;
      if (guests && s.guestRange) {
        const g = parseInt(guests, 10);
        if (!isNaN(g) && (g < s.guestRange[0] || g > s.guestRange[1])) return false;
      }
      return true;
    });
  }, [setting, occasion, guests, spaces]);

  const chip = (active: boolean) =>
    `chip cursor-pointer transition-all duration-300 ${
      active ? "!bg-burgundy !text-ivory !border-burgundy" : "hover:!border-burgundy/40 hover:text-ink"
    }`;

  return (
    <section className="py-16 md:py-24" aria-label={cmsCopy("aria-label.spaces-listing", "Spaces listing")}>
      <div className="container-editorial">
        {/* FILTERS */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 hairline-b">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="label-vij">{cmsCopy("text.setting", "Setting")}</p>
              <div className="flex gap-2">
                {(["ALL", "INDOOR", "OUTDOOR"] as const).map((v) => (
                  <button key={v} onClick={() => setSetting(v)} className={chip(setting === v)} aria-pressed={setting === v}>
                    {v === "ALL" ? "All" : v === "INDOOR" ? "Indoor" : "Outdoor"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label-vij">{cmsCopy("text.occasion", "Occasion")}</p>
              <div className="flex gap-2">
                {(["ALL", "WEDDING", "BUSINESS", "CELEBRATION"] as const).map((v) => (
                  <button key={v} onClick={() => { setOccasion(v); track("event_type_selected", { source: "spaces_filter", type: v }); }} className={chip(occasion === v)} aria-pressed={occasion === v}>
                    {v === "ALL" ? "All" : v === "WEDDING" ? "Wedding" : v === "BUSINESS" ? "Business" : "Celebration"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="min-w-[220px]">
            <label htmlFor="guest-filter" className="label-vij">{cmsCopy("text.guest-count", "Guest Count")}</label>
            <input
              id="guest-filter"
              type="number"
              min={10}
              placeholder={cmsCopy("placeholder.e-g-300", "e.g. 300")}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="input-vij !min-h-[42px] !py-2"
            />
          </div>
        </div>

        {/* GRID */}
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <SearchX className="h-8 w-8 text-stone/50 mx-auto" aria-hidden />
            <h2 className="mt-4 text-xl font-normal">{cmsCopy("text.no-spaces-match-these-filters", "No spaces match these filters")}</h2>
            <p className="mt-2 text-sm text-stone">{cmsCopy("text.try-widening-the-guest-count-or-clearing-a-fi", "Try widening the guest count or clearing a filter — or ask the concierge for a recommendation.")}</p>
            <button onClick={() => { setSetting("ALL"); setOccasion("ALL"); setGuests(""); }} className="btn-outline mt-6">
              <span>{cmsCopy("text.clear-filters", "Clear Filters")}</span>
            </button>
          </div>
        ) : (
          <div className="mt-12 grid gap-x-6 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 0.08}>
                <article>
                  <Link href={`/spaces/${s.slug}`} className="group block" onClick={() => track("venue_viewed", { venue: s.slug, source: "listing" })}>
                    <div className="relative aspect-[4/3] overflow-hidden bg-sand/30">
                      <Media
                        src={s.heroImage}
                        alt={s.heroImageAlt ?? `${s.officialName} — placeholder visual`}
                        className="transition-transform duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        quality={s.heroImageQuality ?? 75}
                        tag={s.heroTag !== false}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-80" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-gold">{s.indoorOrOutdoor === "INDOOR" ? "Indoor" : "Outdoor"}</p>
                          <h2 className="mt-1 text-xl font-normal text-ivory">{s.officialName}</h2>
                        </div>
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ivory/30 text-ivory transition-all duration-500 group-hover:bg-gold group-hover:border-gold group-hover:text-ink">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="pt-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] text-stone">
                        {s.guestRange ? `${s.guestRange[0]}–${s.guestRange[1]} guests (indicative)` : "Capacity to be confirmed"}
                      </p>
                      <p className="text-[12px] text-stone/80 mt-1">{cmsCopy("text.best-for", "Best for: ")}{s.idealEventTypes.slice(0, 2).join(" · ")}</p>
                    </div>
                    <Link
                      href={`/check-your-date?venue=${s.slug}`}
                      className="link-underline text-[11px] uppercase tracking-[0.18em] text-burgundy"
                      onClick={() => track("booking_started", { venue: s.slug, source: "listing_card" })}
                    >{cmsCopy("text.check-availability", "Check Availability")}</Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
