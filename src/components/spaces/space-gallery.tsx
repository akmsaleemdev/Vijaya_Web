"use client";
import { useCmsCopy } from "@/lib/cms/client";


/**
 * SpaceGallery — premium editorial gallery for a space detail page.
 *
 * Two layout modes:
 *  - "symmetric" (default): 2-col 16:9 grid with MaskReveal — used by Periyar, Nila.
 *  - "asymmetric": 12-col editorial masonry alternating 7/5 spans — used by Kabani.
 *
 * Built-in lightbox with prev/next, Escape / Arrow-key support, click-outside to
 * close, near-black background, mobile swipe. No new dependencies. Matches the
 * conventions of `components/gallery/gallery-grid.tsx`.
 */

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Media } from "@/components/media/media";
import { MaskReveal } from "@/components/motion/reveal";

export type GalleryLayout = "symmetric" | "asymmetric";

/** Per-tile span pattern for the asymmetric layout — index % 8 selects. */
const ASYMMETRIC_SPANS = [
  "md:col-span-7", // 01 — large landscape
  "md:col-span-5", // 02 — medium
  "md:col-span-5", // 03 — medium
  "md:col-span-7", // 04 — large landscape
  "md:col-span-7", // 05 — large landscape
  "md:col-span-5", // 06 — medium
  "md:col-span-5", // 07 — medium
  "md:col-span-7", // 08 — large landscape
];

export interface SpaceGalleryProps {
  images: string[];
  alts: string[];
  /** next/image quality for the gallery tiles (default 92, matching historical behaviour). */
  quality?: number;
  /** Layout mode — "symmetric" preserves the Periyar/Nila grid; "asymmetric" enables the 7/5 editorial masonry. */
  layout?: GalleryLayout;
  /** Lightbox enabled (default false — preserves historical non-clickable tile behaviour). When false, tiles are not clickable. */
  lightbox?: boolean;
}

export function SpaceGallery({
  images,
  alts,
  quality = 92,
  layout = "symmetric",
  lightbox = false,
}: SpaceGalleryProps) {
  const [active, setActive] = useState<number | null>(null);

  const close = useCallback(() => setActive(null), []);
  const next = useCallback(
    () => setActive((v) => (v === null ? null : (v + 1) % images.length)),
    [images.length]
  );
  const prev = useCallback(
    () => setActive((v) => (v === null ? null : (v - 1 + images.length) % images.length)),
    [images.length]
  );

  // Keyboard: Escape closes, Arrows navigate. Lock body scroll while open.
  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [active, close, next, prev]);

  // Touch swipe (mobile) — horizontal swipes only; threshold 50px.
  useEffect(() => {
    if (active === null) return;
    let startX: number | null = null;
    const onStart = (e: TouchEvent) => {
      startX = e.touches[0]?.clientX ?? null;
    };
    const onEnd = (e: TouchEvent) => {
      if (startX === null) return;
      const endX = e.changedTouches[0]?.clientX ?? startX;
      const dx = endX - startX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) next();
        else prev();
      }
      startX = null;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [active, next, prev]);

  if (layout === "asymmetric") {
    return (
      <>
        <div className="mt-10 grid grid-cols-1 gap-3.5 md:grid-cols-12 md:gap-5">
          {images.map((src, i) => {
            const span = ASYMMETRIC_SPANS[i % ASYMMETRIC_SPANS.length];
            return (
              <MaskReveal
                key={src + i}
                className={`relative aspect-[16/10] ${span}`}
                delay={i * 0.05}
              >
                <button
                  type="button"
                  onClick={lightbox ? () => setActive(i) : undefined}
                  className="group block h-full w-full"
                  aria-label={lightbox ? `Open image ${i + 1} of ${images.length}` : undefined}
                >
                  <Media
                    src={src}
                    alt={alts[i] ?? `Gallery image ${i + 1}`}
                    sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 58vw"
                    quality={quality}
                    tag={false}
                    className="transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  />
                </button>
              </MaskReveal>
            );
          })}
        </div>

        {lightbox && active !== null && images[active] && (
          <Lightbox
            src={images[active]}
            alt={alts[active] ?? `Gallery image ${active + 1}`}
            index={active}
            total={images.length}
            onClose={close}
            onNext={next}
            onPrev={prev}
          />
        )}
      </>
    );
  }

  // symmetric (default) — preserve existing Periyar/Nila 2-col 16:9 grid exactly.
  return (
    <>
      <div className="mt-10 grid gap-4 md:gap-6 md:grid-cols-2">
        {images.map((src, i) => (
          <MaskReveal key={src + i} className="relative aspect-[16/9]" delay={i * 0.05}>
            <button
              type="button"
              onClick={lightbox ? () => setActive(i) : undefined}
              className="group block h-full w-full"
              aria-label={lightbox ? `Open image ${i + 1} of ${images.length}` : undefined}
            >
              <Media
                src={src}
                alt={alts[i] ?? `Gallery image ${i + 1}`}
                sizes="(max-width: 767px) 100vw, 50vw"
                quality={quality}
                tag={false}
                className="transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              />
            </button>
          </MaskReveal>
        ))}
      </div>

      {lightbox && active !== null && images[active] && (
        <Lightbox
          src={images[active]}
          alt={alts[active] ?? `Gallery image ${active + 1}`}
          index={active}
          total={images.length}
          onClose={close}
          onNext={next}
          onPrev={prev}
        />
      )}
    </>
  );
}

/** Minimal lightbox — near-black bg, prev/next, no caption, click-outside to close. */
function Lightbox({
  src,
  alt,
  index,
  total,
  onClose,
  onNext,
  onPrev,
}: {
  src: string;
  alt: string;
  index: number;
  total: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const cmsCopy = useCmsCopy("copy.components.spaces.space-gallery");
  return (
    <div
      className="fixed inset-0 z-[70] bg-ink/95 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={cmsCopy("aria-label.image-lightbox", "Image lightbox")}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-5 right-5 p-3 text-ivory/70 hover:text-ivory transition-colors"
        aria-label={cmsCopy("aria-label.close-lightbox", "Close lightbox")}
      >
        <X className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPrev();
        }}
        className="absolute left-4 md:left-8 p-3 text-ivory/70 hover:text-ivory transition-colors"
        aria-label={cmsCopy("aria-label.previous-image", "Previous image")}
      >
        <ChevronLeft className="h-8 w-8" />
      </button>
      <figure
        className="relative w-[90vw] max-w-6xl aspect-[16/10]"
        onClick={(e) => e.stopPropagation()}
      >
        <Media src={src} alt={alt} sizes="90vw" tag={false} priority />
      </figure>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNext();
        }}
        className="absolute right-4 md:right-8 p-3 text-ivory/70 hover:text-ivory transition-colors"
        aria-label={cmsCopy("aria-label.next-image", "Next image")}
      >
        <ChevronRight className="h-8 w-8" />
      </button>
      {/* Position-only counter — no caption, no filename */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-ivory/60 text-[12px] tracking-[0.2em] uppercase">
        {index + 1} / {total}
      </div>
    </div>
  );
}
