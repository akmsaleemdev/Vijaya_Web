import { pageCopy, pageMetadata, siteContent } from "@/lib/content";
import type { Metadata } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { GalleryGrid } from "@/components/gallery/gallery-grid";

const metadata: Metadata = {
  title: "Gallery",
  description:
    "Photography from VIJAYA International Convention Centre — property, weddings, corporate events, celebrations, outdoor settings and architectural details.",
};

export default async function GalleryPage() {
  const [copy, items] = await Promise.all([pageCopy("gallery"), siteContent("gallery.items")]);
  const gallery = items?.filter((item) => item.published !== false).map((item) => ({ ...item, caption: item.caption ?? item.alt }));
  return (
    <main>
      <PageHero
        eyebrow={copy("eyebrow.gallery", "Gallery")}
        title={copy("title.the-destination-framed", "The Destination, Framed.")}
        intro={copy("intro.a-first-look-at-vijaya-placeholder-imagery-until-t", "A first look at VIJAYA — placeholder imagery until the new professional shoot premieres. Fullscreen lightbox included.")}
        image={copy("image.exp-arrival-jpg", "/media/exp-arrival.jpg")}
        height="mid"
      />
      <GalleryGrid gallery={gallery} />
    </main>
  );
}

export const generateMetadata = () => pageMetadata("gallery", metadata);
