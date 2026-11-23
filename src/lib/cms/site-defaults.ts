import type { Metadata } from "next";
import { SITE } from "../site-config";

export const ROOT_METADATA: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.officialName} — ${SITE.tagline}`,
    template: `%s — ${SITE.displayName}`,
  },
  description:
    "VIJAYA International Convention Centre, Thiruvalla, Kerala — a premium destination for weddings, celebrations and business events. Check your date, explore our spaces and plan your occasion.",
  keywords: [
    "wedding venue Thiruvalla",
    "convention centre Thiruvalla",
    "luxury wedding venue Pathanamthitta",
    "wedding venue near Kottayam",
    "NRI wedding venue Kerala",
    "corporate event venue Kerala",
  ],
  openGraph: {
    title: `${SITE.officialName}`,
    description: "A premium destination for weddings, celebrations and business events in Kerala.",
    url: SITE.url,
    siteName: SITE.displayName,
    type: "website",
    images: [{ url: "/media/hero-dusk.jpg", width: 1536, height: 768, alt: SITE.officialName }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.officialName,
    description: "A premium destination for weddings, celebrations and business events in Kerala.",
  },
  icons: { icon: "/favicon.svg" },
};

export const ROOT_STRUCTURED_DATA = {
              "@context": "https://schema.org",
              "@type": "EventVenue",
              name: SITE.officialName,
              alternateName: SITE.legacyName,
              slogan: SITE.tagline,
              address: {
                "@type": "PostalAddress",
                addressLocality: "Thiruvalla",
                addressRegion: "Kerala",
                addressCountry: "IN",
              },
              url: SITE.url,
            };

export const HOME_HERO = {
  eyebrow: "VIJAYA International Convention Centre",
  heading: "Every Great Occasion Deserves a Grand Address.",
  intro: "A premium destination for weddings, celebrations and business events — set in the heart of Kerala.",
  desktop: "/media/vijaya-hero-desktop.mp4",
  mobile: "/media/vijaya-hero-mobile.mp4",
};

export const HOME_OCCASIONS = [
              { href: "/weddings", img: "/media/Image-01.webp", title: "Wedding", alt: "Wedding celebration at VIJAYA International Convention Centre", copy: "Weddings, receptions and every ritual between — framed at scale." },
              { href: "/business", img: "/media/Image_Business Events-Homepage-Vijaya-VICC.webp", title: "Business Event", alt: "Business conference at VIJAYA International Convention Centre", copy: "Conferences, exhibitions and leadership events, operationally precise." },
              { href: "/celebrations", img: "/media/Image_Celebrations-Homepage-Vijaya-VICC.webp", title: "Celebration", alt: "Celebration experience at VIJAYA International Convention Centre", copy: "Birthdays, anniversaries, cultural and community occasions." },
            ];
