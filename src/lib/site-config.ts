/**
 * VIJAYA International Convention Centre — global site configuration.
 *
 * DATA STATUS: All operational constants below are PROVISIONAL until the
 * VICC master data is approved. Every value is editable in this single file.
 */

export const SITE = {
  officialName: "VIJAYA International Convention Centre",
  displayName: "VIJAYA",
  legacyName: "VICC",
  tagline: "A Frame for Possibilities.",
  location: "Thiruvalla, Pathanamthitta, Kerala, India",
  url: "https://www.vicc.in",
  /**
   * CONTACT: Placeholder structure — verify with VICC management before launch.
   */
  contact: {
    phone: "+91 469 000 0000",
    phoneHref: "tel:+914690000000",
    whatsapp: "+91 90000 00000",
    whatsappHref: "https://wa.me/919000000000",
    email: "hello@vijaya.in",
    globalDeskEmail: "global@vijaya.in",
    addressLines: [
      "VIJAYA International Convention Centre",
      "Thiruvalla, Pathanamthitta District",
      "Kerala, India",
    ],
  },
} as const;

/** Global switch — show "Placeholder media" tags until the official VIJAYA shoot assets are loaded. */
export const SHOW_MEDIA_PLACEHOLDER_TAGS = true;

/**
 * Feature flag — 360° / Virtual Tour / Panorama experience.
 *
 * Set to `false` to hide every public-facing 360° UI element (nav links,
 * CTAs, teaser sections, space-card 360 previews, concierge suggestions)
 * across the entire website. The underlying route (`/360-tour`), the
 * PanoramaViewer components and the SCENES_360 / scenes360 data are all
 * retained internally so the feature can be re-enabled later by flipping
 * this single flag back to `true`.
 */
export const SHOW_VIRTUAL_TOUR = false;

/** Booking engine constants — all CONFIGURABLE BY VICC. */
export const BOOKING_CONFIG = {
  /** Temporary hold duration in minutes (prototype example: 10). */
  holdMinutes: 10,
  /** Deposit / token amount as a share of base rent (SAMPLE rule). */
  tokenShare: 0.25,
  /** Sample GST rate applied to quotes. 0 = "as applicable, confirmed at quotation". */
  taxRateSample: 0.12,
  /** CRM synchronisation is not yet connected. */
  crmConnected: false,
  /** Shared secret header expected by /api/crm/sync. */
  crmSyncHeader: "x-vicc-key",
} as const;

export type EventCategory = "WEDDING" | "BUSINESS" | "CELEBRATION";

export const EVENT_CATEGORIES: { id: EventCategory; label: string; blurb: string }[] = [
  { id: "WEDDING", label: "Wedding", blurb: "Weddings, receptions, engagements and related celebrations" },
  { id: "BUSINESS", label: "Business Event", blurb: "Conferences, meetings, exhibitions and launches" },
  { id: "CELEBRATION", label: "Celebration", blurb: "Birthdays, anniversaries, community and cultural events" },
];

export type SlotId = "MORNING" | "AFTERNOON" | "EVENING" | "FULL_DAY";

export const SLOTS: { id: SlotId; label: string; time: string }[] = [
  { id: "MORNING", label: "Morning", time: "7:00 AM – 1:00 PM" },
  { id: "AFTERNOON", label: "Afternoon", time: "1:00 PM – 6:00 PM" },
  { id: "EVENING", label: "Evening", time: "6:00 PM – 11:00 PM" },
  { id: "FULL_DAY", label: "Full Day", time: "Full day access" },
];

/** Availability status model — mirrored across the engine, CRM contract and UI. */
export type AvailabilityStatus =
  | "AVAILABLE"
  | "TEMPORARY_HOLD"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "BLOCKED"
  | "MAINTENANCE"
  | "INTERNAL_USE"
  | "CANCELLED";

export const MAIN_NAV: { label: string; href: string }[] = [
  { label: "Weddings", href: "/weddings" },
  { label: "Business", href: "/business" },
  { label: "Celebrations", href: "/celebrations" },
  { label: "Spaces", href: "/spaces" },
  { label: "Experiences", href: "/experiences" },
  { label: "Plan Your Event", href: "/plan-your-event" },
];

export const FOOTER_NAV: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { label: "About VIJAYA", href: "/about" },
      { label: "Our Spaces", href: "/spaces" },
      { label: "Experiences", href: "/experiences" },
      { label: "360° Tour", href: "/360-tour" },
      { label: "Gallery", href: "/gallery" },
    ],
  },
  {
    title: "Plan",
    links: [
      { label: "Check Your Date", href: "/check-your-date" },
      { label: "Plan Your Event", href: "/plan-your-event" },
      { label: "Book a Venue Visit", href: "/venue-visit" },
      { label: "VIJAYA Global Desk", href: "/global-desk" },
      { label: "My VIJAYA", href: "/my-vijaya" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Occasions",
    links: [
      { label: "Weddings", href: "/weddings" },
      { label: "Business & MICE", href: "/business" },
      { label: "Celebrations", href: "/celebrations" },
      { label: "FAQ", href: "/faq" },
      { label: "Booking Policy", href: "/booking-policy" },
      { label: "Cancellation Policy", href: "/cancellation-policy" },
    ],
  },
];

export const CRM_LEAD_STAGES = [
  "New Lead",
  "Qualified",
  "Venue Visit",
  "Quote Sent",
  "Negotiation",
  "Temporary Hold",
  "Payment Pending",
  "Booked",
  "Cancelled",
] as const;
