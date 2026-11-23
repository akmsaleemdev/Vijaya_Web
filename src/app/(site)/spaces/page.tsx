import type { Metadata } from "next";
import { SpacesListing } from "@/components/booking/spaces-listing";
import { PageHero } from "@/components/layout/page-hero";

export const metadata: Metadata = {
  title: "Our Spaces",
  description:
    "Explore every hall, pavilion and outdoor setting at VIJAYA International Convention Centre — filter by indoor or outdoor, occasion and guest count.",
};

export default function SpacesPage() {
  return (
    <main>
      <PageHero
        eyebrow="The Collection"
        title="Spaces for Occasions of Every Scale."
        intro="Nine distinct settings — from the grand Periyar hall to the quiet lake deck. Filter by setting, occasion or guest count to find yours."
        image="/media/exp-architecture.jpg"
        height="mid"
      />
      <SpacesListing />
    </main>
  );
}
