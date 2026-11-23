"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { GALLERY } from "@/lib/data/content";
import { Media } from "@/components/media/media";
import { Reveal } from "@/components/motion/reveal";

const CATEGORIES = ["All", "Property", "Weddings", "Corporate Events", "Celebrations", "Outdoor", "Architecture", "Details"] as const;

type GridItem = { src: string; category: string; caption: string; alt?: string };

export function GalleryGrid({ gallery = GALLERY }: { gallery?: GridItem[] }) {
  const [cat, setCat] = useState("All");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const items = useMemo(() => (cat === "All" ? gallery : gallery.filter((g) => g.category === cat)), [cat, gallery]);

  const close = useCallback(() => setLightbox(null), []);
  const next = useCallback(() => setLightbox((v) => (v === null ? null : (v + 1) % items.length)), [items.length]);
  const prev = useCallback(() => setLightbox((v) => (v === null ? null : (v - 1 + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (lightbox === null) return;
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
  }, [lightbox, close, next, prev]);

  const chip = (active: boolean) =>
    `chip cursor-pointer transition-all duration-300 ${active ? "!bg-burgundy !text-ivory !border-burgundy" : "hover:!border-burgundy/40 hover:text-ink"}`;

  return (
    <section className="py-14 md:py-20" aria-label="Gallery">
      <div className="container-editorial">
        <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Filter gallery">
          {Array.from(new Set([...CATEGORIES, ...gallery.map((item) => item.category)])).map((c) => (
            <button key={c} onClick={() => { setCat(c); setLightbox(null); }} className={chip(cat === c)} aria-pressed={cat === c}>
              {c}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="py-24 text-center">
            <SearchX className="h-8 w-8 text-stone/50 mx-auto" aria-hidden />
            <p className="mt-4 text-lg">No images in this category yet</p>
            <p className="mt-2 text-sm text-stone">New photography is added after every official shoot.</p>
          </div>
        ) : (
          <div className="mt-10 columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
            {items.map((g, i) => (
              <Reveal key={g.src + i} delay={(i % 4) * 0.05} className="mb-4 break-inside-avoid">
                <button
                  onClick={() => setLightbox(i)}
                  className="group relative block w-full overflow-hidden"
                  aria-label={`Open image: ${g.caption}`}
                >
                  <div className={`relative w-full ${i % 3 === 0 ? "aspect-[3/4]" : i % 3 === 1 ? "aspect-square" : "aspect-[4/3]"}`}>
                    <Media src={g.src} alt={g.alt ?? g.caption} className="transition-transform duration-[1.3s] group-hover:scale-[1.05]" sizes="(max-width: 768px) 50vw, 25vw" />
                  </div>
                  <div className="absolute inset-0 bg-ink/0 transition-colors duration-500 group-hover:bg-ink/25" />
                </button>
              </Reveal>
            ))}
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {lightbox !== null && items[lightbox] && (
        <div className="fixed inset-0 z-[70] bg-ink/95 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Image lightbox" onClick={close}>
          <button onClick={close} className="absolute top-5 right-5 p-3 text-ivory/70 hover:text-ivory transition-colors" aria-label="Close lightbox">
            <X className="h-6 w-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 md:left-8 p-3 text-ivory/70 hover:text-ivory transition-colors" aria-label="Previous image">
            <ChevronLeft className="h-8 w-8" />
          </button>
          <figure className="relative w-[86vw] max-w-5xl aspect-[16/10]" onClick={(e) => e.stopPropagation()}>
            <Media src={items[lightbox].src} alt={items[lightbox].caption} sizes="86vw" tag={false} priority />
          </figure>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 md:right-8 p-3 text-ivory/70 hover:text-ivory transition-colors" aria-label="Next image">
            <ChevronRight className="h-8 w-8" />
          </button>
          <figcaption className="absolute bottom-6 left-1/2 -translate-x-1/2 text-ivory/70 text-[12px] tracking-wide">
            {items[lightbox].caption} — {lightbox + 1} / {items.length}
          </figcaption>
        </div>
      )}
    </section>
  );
}
