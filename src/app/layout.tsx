import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SITE } from "@/lib/site-config";
import { poppins } from "@/lib/fonts";

export const metadata: Metadata = {
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} antialiased bg-ivory text-ink min-h-screen flex flex-col`}>
        {children}
        <Toaster />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
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
            }),
          }}
        />
      </body>
    </html>
  );
}
