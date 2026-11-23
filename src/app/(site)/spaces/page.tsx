import { getPublicVenues } from "@/lib/venue-content";
import { pageCopy, pageMetadata } from "@/lib/content";
import type { Metadata } from "next";
import { SpacesListing } from "@/components/booking/spaces-listing";
import { PageHero } from "@/components/layout/page-hero";

const metadata: Metadata = {
  title: "Our Spaces",
  description:
    "Explore every hall, pavilion and outdoor setting at VIJAYA International Convention Centre — filter by indoor or outdoor, occasion and guest count.",
};

export default async function SpacesPage() {
  const [copy, spaces] = await Promise.all([pageCopy("spaces"), getPublicVenues()]);
  return (
    <main>
      <PageHero
        eyebrow={copy("eyebrow.the-collection", "The Collection")}
        title={copy("title.spaces-for-occasions-of-every-scale", "Spaces for Occasions of Every Scale.")}
        intro={copy("intro.nine-distinct-settings-from-the-grand-periyar-hall", "Nine distinct settings — from the grand Periyar hall to the quiet lake deck. Filter by setting, occasion or guest count to find yours.")}
        image={copy("image.exp-architecture-jpg", "/media/exp-architecture.jpg")}
        height="mid"
      />
      <SpacesListing spaces={spaces} />
    </main>
  );
}

export const generateMetadata = () => pageMetadata("spaces", metadata);
