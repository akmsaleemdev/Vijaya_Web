import type { Metadata } from "next";
import "./globals.css";
import { siteContent } from "@/lib/content";
import { ROOT_METADATA, ROOT_STRUCTURED_DATA } from "@/lib/cms/site-defaults";
import { Toaster } from "@/components/ui/toaster";
import { SITE } from "@/lib/site-config";
import { poppins } from "@/lib/fonts";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await siteContent("site.seo");
  return {
    ...ROOT_METADATA,
    title: seo?.title ? { default: seo.title, template: `%s — ${SITE.displayName}` } : ROOT_METADATA.title,
    description: seo?.description ?? ROOT_METADATA.description,
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const seo = await siteContent("site.seo");
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} antialiased bg-ivory text-ink min-h-screen flex flex-col`}>
        {children}
        <Toaster />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(seo?.structuredData ?? ROOT_STRUCTURED_DATA).replace(/</g, "\\u003c"),
          }}
        />
      </body>
    </html>
  );
}
