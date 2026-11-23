import type { Space } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { db } from "@/lib/db";
import { venueContentSchema } from "@/lib/cms/venue-schema";
import { spaceContent } from "@/lib/content";
import { SPACES, SPACE_BY_SLUG, type SpaceRecord } from "@/lib/data/spaces";

const inventory = cache(async () => {
  try {
    return await unstable_cache(() => db.space.findMany({ orderBy: { sortOrder: "asc" } }), ["vijaya-venue-inventory"], { tags: ["venues"], revalidate: 5 })();
  } catch {
    return [];
  }
});
const array = (value: string | string[] | undefined) => Array.isArray(value) ? value : value?.split("\n").map((item) => item.trim()).filter(Boolean);
const localImage = (value: string) => /^\/(?:media|brand|api\/media)\/[^\\?#]+\.(?:jpg|jpeg|png|webp|avif)(?:\?v=[a-f0-9]+)?$/i.test(value);

async function renderVenue(record: SpaceRecord | undefined, row: Space | undefined): Promise<SpaceRecord | null> {
  if (row?.active === false || (!record && !row)) return null;
  const id = row?.id ?? record?.slug ?? "";
  const parsed = venueContentSchema.safeParse(await spaceContent(id));
  const content = parsed.success ? parsed.data : {};
  const images = array(content.gallery)?.filter(localImage);
  const hero = content.heroImage && localImage(content.heroImage) ? content.heroImage : null;
  const guestRange: [number, number] | null = row?.capacityMin != null && row.capacityMax != null ? [row.capacityMin, row.capacityMax] : record?.guestRange ?? null;
  const fallback: SpaceRecord = record ?? {
    venueId: id, crmVenueId: null, officialName: row?.name ?? id, slug: id, venueCategory: "MULTI", indoorOrOutdoor: "INDOOR",
    shortDescription: "", longDescription: "", guestRange, capacityByLayout: [], dimensions: null, floorArea: null, ceilingHeight: null,
    idealEventTypes: [], seatingLayouts: [], stageDetails: [], avFacilities: [], lightingFacilities: [], greenRooms: "", vipFacilities: [],
    guestEntry: "", serviceEntry: "", parkingNotes: "", accessibility: "", restrooms: "", floorPlan: null,
    heroImage: "/media/exp-architecture.jpg", gallery: [], video: null, showreel: null, scenes360: [], pricing: {},
    slotRules: "", bufferRules: "", availabilityEnabled: false, bookableOnline: false, requiresManualApproval: false, allowedAddons: [], relatedSpaces: [],
  };
  const category = row?.category;
  const setting = row?.setting;
  return {
    ...fallback, ...content, officialName: content.name ?? row?.name ?? fallback.officialName,
    venueCategory: category === "WEDDING" || category === "BUSINESS" || category === "CELEBRATION" || category === "MULTI" ? category : fallback.venueCategory,
    indoorOrOutdoor: setting === "INDOOR" || setting === "OUTDOOR" ? setting : fallback.indoorOrOutdoor,
    shortDescription: content.shortDescription ?? (row?.description || fallback.shortDescription),
    longDescription: content.longDescription ?? (row?.description || fallback.longDescription),
    heroImage: hero ?? fallback.heroImage, heroImageAlt: content.heroImageAlt ?? fallback.heroImageAlt,
    gallery: images ?? fallback.gallery, galleryAlts: images ? array(content.galleryAlts) : fallback.galleryAlts,
    avFacilities: array(content.amenities) ?? content.avFacilities ?? fallback.avFacilities,
    guestRange, bookableOnline: row?.bookableOnline ?? fallback.bookableOnline,
    availabilityEnabled: row?.availabilityEnabled ?? fallback.availabilityEnabled,
    requiresManualApproval: row?.requiresApproval ?? fallback.requiresManualApproval,
  };
}

export const getPublicVenue = cache(async (slug: string) => renderVenue(SPACE_BY_SLUG[slug], (await inventory()).find((row) => row.id === slug)));

export async function getPublicVenues() {
  const rows = await inventory();
  const keys = Array.from(new Set([...SPACES.map((space) => space.slug), ...rows.map((row) => row.id)]));
  const weights = new Map(rows.map(({ id, sortOrder }) => [id, sortOrder]));
  const list = await Promise.all(keys.sort((a, b) => (weights.get(a) ?? 0) - (weights.get(b) ?? 0)).map(getPublicVenue));
  return list.filter((item): item is SpaceRecord => item !== null);
}
