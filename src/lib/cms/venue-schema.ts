import { z } from "zod";
const text = z.string().max(8000);
const strings = z.array(text).max(80);
const media = z.string().regex(/^\/(?:media|brand|api\/media)\/(?!\/)[^\\?#]+(?:\?v=[a-f0-9]+)?$/i);
export const venueContentSchema = z.object({
  name: text, shortDescription: text, longDescription: text,
  heroImage: media, heroImageAlt: text,
  gallery: z.union([z.array(media).max(100), text]), galleryAlts: z.union([strings, text]),
  amenities: z.union([strings, text]), avFacilities: strings,
  dimensions: text.nullable(), floorArea: text.nullable(), ceilingHeight: text.nullable(),
  capacityByLayout: z.array(z.object({ layout: text, count: z.number().int().min(0).nullable() })).max(80),
  idealEventTypes: strings, seatingLayouts: strings, stageDetails: strings,
  lightingFacilities: strings, greenRooms: text, vipFacilities: strings, guestEntry: text,
  serviceEntry: text, parkingNotes: text, accessibility: text, restrooms: text,
  floorPlan: media.nullable(), video: media.nullable(), showreel: media.nullable(),
  scenes360: strings, slotRules: text, bufferRules: text, allowedAddons: strings, relatedSpaces: strings,
}).partial();
