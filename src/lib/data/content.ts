/**
 * VIJAYA editorial content — gallery, experiences, FAQ.
 *
 * EDITORIAL STATUS: Gallery sets are PLACEHOLDER editorial structures
 * demonstrating the platform. They must be replaced with verified VIJAYA
 * events and photography before production. No real event, couple, client
 * or testimonial is claimed or implied.
 */

import { SHOW_VIRTUAL_TOUR } from "@/lib/site-config";

export interface GalleryItem {
  src: string;
  category: "Property" | "Weddings" | "Corporate Events" | "Celebrations" | "Outdoor" | "Architecture" | "Details";
  caption: string;
  type?: "image" | "video";
}

export const GALLERY: GalleryItem[] = [
  { src: "/media/hero-dusk.jpg", category: "Property", caption: "The destination at dusk — placeholder visual" },
  { src: "/media/space-periyar.jpg", category: "Property", caption: "Periyar hall — placeholder visual" },
  { src: "/media/hero-wedding.jpg", category: "Weddings", caption: "Wedding setup — placeholder visual" },
  { src: "/media/weddings-wide.jpg", category: "Weddings", caption: "Reception hall — placeholder visual" },
  { src: "/media/hero-business.jpg", category: "Corporate Events", caption: "Conference setting — placeholder visual" },
  { src: "/media/story-2.jpg", category: "Corporate Events", caption: "Gala evening — placeholder visual" },
  { src: "/media/hero-celebration.jpg", category: "Celebrations", caption: "Lawn dinner — placeholder visual" },
  { src: "/media/space-kabani.jpg", category: "Outdoor", caption: "Kabani pavilion — placeholder visual" },
  { src: "/media/Lake Area-VIJAYA International Convention Centre-VICC-03.webp", category: "Outdoor", caption: "Lake Area at VIJAYA International Convention Centre" },
  { src: "/media/exp-architecture.jpg", category: "Architecture", caption: "Facade detail — placeholder visual" },
  { src: "/media/exp-arrival.jpg", category: "Architecture", caption: "Arrival — placeholder visual" },
  { src: "/media/story-1.jpg", category: "Details", caption: "Kerala details — placeholder visual" },
  { src: "/media/exp-landscape.jpg", category: "Property", caption: "Landscape — placeholder visual" },
  { src: "/media/Hospitality-Luxury Rooms-VIJAYA Conventional Centre-VICC-02.webp", category: "Property", caption: "Hospitality and Luxury Rooms at VIJAYA" },
];

export interface ExperienceBlock {
  id: string;
  title: string;
  text: string;
  image: string;
  helipad?: boolean;
}

export const EXPERIENCES: ExperienceBlock[] = [
  {
    id: "architecture",
    title: "Architecture",
    text: "A composition of frames and light — the same idea that shapes the VIJAYA mark shapes the destination. Clean geometry, warm materials and quiet confidence.",
    image: "/media/Destinations Section_Architecture-VICC.webp",
  },
  {
    id: "arrival",
    title: "Arrival",
    text: "The occasion begins at the gate. A grand porte-cochère, a composed welcome and a slow reveal of the destination set the tone long before the first ceremony.",
    image: "/media/Destinations Section_Arrival-VICC.webp",
  },
  {
    id: "landscape",
    title: "Landscape",
    text: "Kerala's green vocabulary — palms, flowering trees, lawns and water — threads the buildings together into one walkable, breathable destination.",
    image: "/media/Destinations Section_Landscape-VICC.webp",
  },
  {
    id: "lake",
    title: "The Lake",
    text: "Still water at the heart of the property. Ceremonies at golden hour, quiet mornings, and the photographs every family keeps.",
    image: "/media/Destinations Section_The Lake-VICC.webp",
  },
  {
    id: "outdoor",
    title: "Outdoor Event Areas",
    text: "Open grounds for the largest celebrations — configured per event with stages, pavilions and festival infrastructure.",
    image: "/media/Destinations Section_Outdoor Spaces-VICC.webp",
  },
  {
    id: "vip",
    title: "VIP Experience",
    text: "Discreet routes, private lounges, dedicated dining and a team that anticipates rather than announces.",
    image: "/media/Destinations Section_VIP Experience-VICC.webp",
  },
  {
    id: "hospitality",
    title: "Hospitality",
    text: "Green rooms, service corridors, guest relations and catering coordination — the invisible machinery of a calm event day.",
    image: "/media/Destinations Section_Hospitality-VICC.webp",
  },
  {
    id: "parking",
    title: "Parking & Access",
    text: "Extensive on-site parking, dedicated service gates and planned traffic flow for events of every scale. Final counts to be confirmed.",
    image: "/media/Destinations Section_Parking-VICC.webp",
  },
  {
    id: "helipad",
    title: "Helipad",
    text: "Helicopter arrivals where operationally approved — always under DGCA regulations and event-day clearance, arranged with VIJAYA operations.",
    image: "/media/Destinations Section_Helipad-VICC.webp",
    helipad: true,
  },
];

export interface FaqItem {
  q: string;
  a: string;
  group: "Booking" | "Planning" | "Facilities" | "Policies";
}

export const FAQS: FaqItem[] = [
  {
    group: "Booking",
    q: "How do I check whether my date is available?",
    a: "Use Check Your Date on this website. Choose your event type, date, slot and expected guest count, and the system will show which spaces are available. Availability shown online is validated server-side and stays synchronised with VIJAYA's booking office.",
  },
  {
    group: "Booking",
    q: "What is a temporary hold?",
    a: "When you begin checkout, your selected space, date and slot are held for a short configurable window (10 minutes in this build) while you complete your details and payment. If payment is not completed in time, the hold is released automatically.",
  },
  {
    group: "Booking",
    q: "Can I book offline as well?",
    a: "Yes. VIJAYA's booking office manages offline bookings through the same system. A date or slot booked offline becomes unavailable online immediately — one calendar, two doors.",
  },
  {
    group: "Booking",
    q: "Is online booking open for every space?",
    a: "Most spaces can be booked online. Certain configurations — the Helipad, large outdoor builds and combined-hall setups — require operational approval and are arranged through the VIJAYA events team.",
  },
  {
    group: "Planning",
    q: "We live abroad. Can we plan the entire wedding remotely?",
    a: SHOW_VIRTUAL_TOUR
      ? "Yes. The VIJAYA Global Desk supports families in the UAE, Qatar, Oman, Saudi Arabia, Kuwait and Bahrain with 360° tours, virtual consultations, remote date checking, digital documentation and online payment."
      : "Yes. The VIJAYA Global Desk supports families in the UAE, Qatar, Oman, Saudi Arabia, Kuwait and Bahrain with virtual consultations, remote date checking, digital documentation and online payment.",
  },
  {
    group: "Planning",
    q: "Can we visit the venue before booking?",
    a: "Absolutely — and we recommend it. Request a private venue visit and the events team will walk you through the halls, outdoor areas and facilities with your event in mind.",
  },
  {
    group: "Planning",
    q: "Are capacities and dimensions published anywhere?",
    a: "Space pages currently show indicative ranges marked as provisional. Verified capacities, dimensions and floor areas are being finalised by VICC management and will be published once approved. We do not present unverified numbers as facts.",
  },
  {
    group: "Facilities",
    q: "Is parking available for guests?",
    a: "Yes, VIJAYA provides extensive on-site parking. Exact capacity by event scale is being confirmed and will be published with the verified master data.",
  },
  {
    group: "Facilities",
    q: "Does VIJAYA support corporate AV requirements?",
    a: "Halls are equipped with professional PA systems, microphones and projection readiness. Detailed AV specifications, LED wall options and production partnerships are confirmed at quotation.",
  },
  {
    group: "Policies",
    q: "What are the payment terms?",
    a: "A token amount confirms the booking, with the balance scheduled per the booking agreement. All amounts shown at checkout — including taxes and mandatory charges — are presented before you pay. Payment gateway integration and final terms are being configured with VICC.",
  },
  {
    group: "Policies",
    q: "What is the cancellation policy?",
    a: "Cancellations follow the published VIJAYA cancellation policy. Please review the Cancellation Policy page and confirm final terms with the events team at booking.",
  },
];

/** Destination blocks for the homepage "Beyond the Halls" section. */
export const DESTINATION_BLOCKS = [
  { title: "Architecture", image: "/media/Destinations Section_Architecture-VICC.webp", href: "/experiences#architecture" },
  { title: "Arrival", image: "/media/Destinations Section_Arrival-VICC.webp", href: "/experiences#arrival" },
  { title: "Outdoor Spaces", image: "/media/Destinations Section_Outdoor Spaces-VICC.webp", href: "/experiences#outdoor" },
  { title: "Landscape", image: "/media/Destinations Section_Landscape-VICC.webp", href: "/experiences#landscape" },
  { title: "The Lake", image: "/media/Destinations Section_The Lake-VICC.webp", href: "/experiences#lake" },
  { title: "VIP Experience", image: "/media/Destinations Section_VIP Experience-VICC.webp", href: "/experiences#vip" },
  { title: "Hospitality", image: "/media/Destinations Section_Hospitality-VICC.webp", href: "/experiences#hospitality" },
  { title: "Parking", image: "/media/Destinations Section_Parking-VICC.webp", href: "/experiences#parking" },
  { title: "Helipad", image: "/media/Destinations Section_Helipad-VICC.webp", href: "/experiences#helipad" },
];

/** 360 scenes — equirectangular placeholders until Insta360 exports are supplied. */
export const SCENES_360 = [
  {
    id: "pano-hall",
    name: "Grand Hall",
    image: "/media/pano-hall.jpg",
    initialYaw: 0,
    hotspots: [
      { yaw: 0.6, pitch: -0.05, label: "Main stage", target: "pano-lobby" },
      { yaw: -1.4, pitch: -0.02, label: "Banquet floor", target: "pano-lake" },
    ],
  },
  {
    id: "pano-lake",
    name: "Lake Deck",
    image: "/media/pano-lake.jpg",
    initialYaw: 0,
    hotspots: [
      { yaw: 1.2, pitch: -0.03, label: "Back to Grand Hall", target: "pano-hall" },
      { yaw: -0.7, pitch: -0.05, label: "Lobby", target: "pano-lobby" },
    ],
  },
  {
    id: "pano-lobby",
    name: "Arrival Lobby",
    image: "/media/pano-lobby.jpg",
    initialYaw: 0,
    hotspots: [
      { yaw: -1.0, pitch: -0.04, label: "Enter Grand Hall", target: "pano-hall" },
      { yaw: 1.3, pitch: -0.05, label: "Walk to the Lake", target: "pano-lake" },
    ],
  },
];
