import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Media } from "@/components/media/media";
import { HeroText, Reveal } from "@/components/motion/reveal";

/** Full-width cinematic page hero used across editorial pages. */
export function PageHero({
  eyebrow,
  title,
  intro,
  image,
  imageAlt,
  overlayClassName,
  ctas,
  height = "tall",
  tag = true,
  quality = 75,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  image: string;
  /** Optional custom alt text — falls back to the historical generated alt. */
  imageAlt?: string;
  /** Optional extra scrim (e.g. for bright imagery) — rendered between the image and the vignette. */
  overlayClassName?: string;
  ctas?: { label: string; href: string; variant?: "primary" | "ghost" }[];
  height?: "tall" | "mid";
  /** Placeholder-badge switch — defaults to true for pages still using placeholder imagery. */
  tag?: boolean;
  /** Optional next/image quality override (default 75 — unchanged historical behavior). */
  quality?: number;
}) {
  return (
    <section className={`relative overflow-hidden bg-ink text-ivory ${height === "tall" ? "h-[86svh] min-h-[560px]" : "h-[68svh] min-h-[460px]"}`}>
      <div className="absolute inset-0">
        <div className="kenburns absolute inset-[-3%]">
          <Media src={image} alt={imageAlt ?? `${title} — placeholder visual`} tag={tag} priority sizes="100vw" quality={quality} />
        </div>
        {overlayClassName && <div className={`absolute inset-0 ${overlayClassName}`} />}
        <div className="absolute inset-0 vignette" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink/80 to-transparent" />
      </div>
      <div className="relative z-10 container-editorial h-full flex flex-col justify-end pb-20 md:pb-24">
        <HeroText
          lines={[
            <p key="e" className="eyebrow">{eyebrow}</p>,
            <h1 key="t" className="h-display mt-4 max-w-3xl">{title}</h1>,
          ]}
        />
        {intro && (
          <Reveal delay={0.6}>
            <p className="lede !text-ivory/70 mt-5 max-w-xl">{intro}</p>
          </Reveal>
        )}
        {ctas && ctas.length > 0 && (
          <Reveal delay={0.75}>
            <div className="mt-8 flex flex-wrap gap-4">
              {ctas.map((c) => (
                <Link key={c.href + c.label} href={c.href} className={c.variant === "ghost" ? "btn-outline-light" : "btn-primary"}>
                  <span>{c.label}</span>
                </Link>
              ))}
            </div>
          </Reveal>
        )}
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hidden md:block text-ivory/50">
        <ChevronDown className="scroll-cue h-4 w-4" />
      </div>
    </section>
  );
}
