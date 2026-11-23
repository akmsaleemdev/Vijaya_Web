import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site-config";

/**
 * Official VIJAYA logo — the single canonical brand mark used everywhere
 * on the site. One component, three variants mapped to background contrast:
 *
 *   "burgundy" → light / ivory / white backgrounds (scrolled header, light sections)
 *   "white"    → dark backgrounds, dark heroes, overlays, dark mobile menus
 *   "gold"     → premium dark presentation areas (footer, transparent hero header)
 *
 * The source PNGs are 1081×300 (aspect 3.603) and are rendered through
 * Next.js <Image> with their intrinsic width/height plus `h-auto`, so the
 * logo is never stretched, squashed, cropped or rotated — its transparent
 * background and exact proportions are preserved at every breakpoint.
 *
 * Rendered widths follow the brand spec: 180–220px on desktop, 140–170px
 * on mobile. Size presets use static Tailwind classes so they survive the
 * build-time purge.
 */
export type LogoVariant = "burgundy" | "white" | "gold";

const LOGO_SRC: Record<LogoVariant, string> = {
  burgundy: "/brand/vijaya-logo-burgundy.png",
  white: "/brand/vijaya-logo-white.png",
  gold: "/brand/vijaya-logo-gold.png",
};

const SIZE_CLASSES = {
  /** Header — 150px mobile / 200px desktop. */
  header: "w-[150px] h-auto md:w-[200px]",
  /** Footer — 150px mobile / 200px desktop. */
  footer: "w-[150px] h-auto md:w-[200px]",
  /** Minimal booking chrome — 150px mobile / 180px desktop. */
  book: "w-[150px] h-auto md:w-[180px]",
  /** My VIJAYA portal — 160px mobile / 180px desktop. */
  portal: "w-[160px] h-auto md:w-[180px]",
  /** About-page variant gallery — height-driven (56px). */
  showcase: "h-14 w-auto",
} as const;

/** `sizes` hints for the Next.js image optimizer, per preset. */
const SIZE_SOURCES = {
  header: "(min-width: 768px) 200px, 150px",
  footer: "(min-width: 768px) 200px, 150px",
  book: "(min-width: 768px) 180px, 150px",
  portal: "(min-width: 768px) 180px, 160px",
  showcase: "201px",
} as const;

type LogoSize = keyof typeof SIZE_CLASSES;

type LogoProps = {
  variant: LogoVariant;
  size?: LogoSize;
  /** Load eagerly (above-the-fold header/portal logos). */
  priority?: boolean;
  /** Wrap the logo in a <Link> to this href. */
  href?: string;
  ariaLabel?: string;
  className?: string;
};

export function Logo({
  variant,
  size = "header",
  priority,
  href,
  ariaLabel,
  className,
}: LogoProps) {
  const img = (
    <Image
      src={LOGO_SRC[variant]}
      alt={ariaLabel ?? SITE.officialName}
      width={1081}
      height={300}
      priority={priority}
      sizes={SIZE_SOURCES[size]}
      className={`object-contain ${SIZE_CLASSES[size]} ${className ?? ""}`}
    />
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel ?? `${SITE.displayName} — home`}
        className="inline-flex shrink-0 transition-opacity hover:opacity-80"
      >
        {img}
      </Link>
    );
  }
  return img;
}
