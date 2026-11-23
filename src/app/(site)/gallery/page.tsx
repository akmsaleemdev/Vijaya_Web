import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photography from VIJAYA International Convention Centre — property, weddings, corporate events, celebrations, outdoor settings and architectural details.",
};

export default function GalleryPage() {
  return (
    <main>
      <PageHero
        eyebrow="Gallery"
        title="The Destination, Framed."
        intro="A first look at VIJAYA — placeholder imagery until the new professional shoot premieres. Fullscreen lightbox included."
        image="/media/exp-arrival.jpg"
        height="mid"
      />
      <GalleryGrid />
    </main>
  );
}
