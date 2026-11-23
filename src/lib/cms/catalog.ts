import componentDefaults from "./component-defaults.json";
import pageDefaults from "@/lib/admin/page-defaults.json";
import { DESTINATION_BLOCKS, EXPERIENCES, FAQS, GALLERY, SCENES_360 } from "@/lib/data/content";
import { SPACES } from "@/lib/data/spaces";
import { FOOTER_NAV, MAIN_NAV, SHOW_VIRTUAL_TOUR, SITE } from "@/lib/site-config";
import { HOME_HERO, HOME_OCCASIONS, ROOT_STRUCTURED_DATA } from "./site-defaults";
import { venueContentSchema } from "./venue-schema";

export const contentCatalog = {
  ...pageDefaults,
  ...componentDefaults,
  "home.hero": {
    ...HOME_HERO,
    poster: pageDefaults["page.home"]["posterImage.hero-video-poster-jpg"],
    posterAlt: pageDefaults["page.home"]["posterAlt.vijaya-hero-video-opening-frame"],
  },
  "home.occasions": HOME_OCCASIONS,
  "home.destinations": DESTINATION_BLOCKS,
  "site.experiences": EXPERIENCES,
  "site.scenes": SCENES_360,
  "site.navigation": MAIN_NAV,
  "site.footer": FOOTER_NAV,
  "site.contact": {
    phone: SITE.contact.phone, email: SITE.contact.email, whatsapp: SITE.contact.whatsapp,
    address: SITE.contact.addressLines.join("\n"),
  },
  "site.settings": { showVirtualTour: SHOW_VIRTUAL_TOUR, maintenance: false },
  "site.seo": { structuredData: ROOT_STRUCTURED_DATA },
  "site.faq": FAQS.map(({ q, a, group }) => ({ q, a, category: group })),
  "gallery.items": GALLERY.map(({ src, caption, category }) => ({ src, caption, category, alt: caption })),
  ...Object.fromEntries(SPACES.map((space) => [
    `venue.${space.slug}`, venueContentSchema.parse({ ...space, name: space.officialName }),
  ])),
} satisfies Record<string, unknown>;
