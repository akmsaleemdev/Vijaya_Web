import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { SpaceRecord } from "@/lib/data/spaces";
import { inr } from "@/lib/pricing";
import { Media } from "@/components/media/media";
import { Reveal } from "@/components/motion/reveal";

export function VenueCard({ space, index = 0 }: { space: SpaceRecord; index?: number }) {
  const range = space.guestRange ? `${space.guestRange[0]}–${space.guestRange[1]} guests` : "Capacity to be confirmed";
  const price = space.pricing.EVENING ?? space.pricing.fullDay;
  return (
    <Reveal delay={index * 0.08}>
      <Link href={`/spaces/${space.slug}`} className="group block" aria-label={`Explore ${space.officialName}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-sand/30">
          <Media
            src={space.heroImage}
            alt={space.heroImageAlt ?? `${space.officialName} — placeholder visual`}
            className="transition-transform duration-[1.4s] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
            sizes="(max-width: 768px) 100vw, 33vw"
            quality={space.heroImageQuality ?? 75}
            tag={space.heroTag !== false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-80" />
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-gold">{space.indoorOrOutdoor === "INDOOR" ? "Indoor" : "Outdoor"}</p>
              <h3 className="mt-1 text-xl font-normal text-ivory">{space.officialName}</h3>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ivory/30 text-ivory transition-all duration-500 group-hover:bg-gold group-hover:border-gold group-hover:text-ink">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 pt-4">
          <p className="text-[13px] text-stone">{range}</p>
          {price ? (
            <p className="text-[12px] text-stone">
              From <span className="text-ink font-medium">{inr(price)}</span>
              <span className="text-[10px] uppercase tracking-wider text-stone/70"> · sample</span>
            </p>
          ) : (
            <p className="text-[12px] text-stone">On request</p>
          )}
        </div>
      </Link>
    </Reveal>
  );
}
