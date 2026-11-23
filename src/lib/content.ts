import type { z } from "zod";
import { contentSchemas } from "@/lib/admin/content-schema";
import { getContent, getLocale, getPageContent } from "@/lib/cms/read";

export const pageCopy = getPageContent;

export async function siteContent<K extends keyof typeof contentSchemas>(key: K, locale?: string): Promise<z.output<(typeof contentSchemas)[K]> | null> {
  const result = contentSchemas[key].safeParse(await getContent(key, locale ?? await getLocale()));
  return result.success ? result.data as z.output<(typeof contentSchemas)[K]> : null;
}

export async function pageMetadata(key: string, fallback: import("next").Metadata): Promise<import("next").Metadata> {
  const [copy, defaults] = await Promise.all([pageCopy(key), siteContent("site.seo")]);
  const title = copy("seo.title", typeof fallback.title === "string" ? fallback.title : defaults?.title ?? "");
  const description = copy("seo.description", fallback.description ?? defaults?.description ?? "");
  const image = copy("seo.ogImage", defaults?.ogImage ?? "");
  const canonical = copy("seo.canonical", defaults?.canonical ?? "");
  return {
    ...fallback,
    title: title || fallback.title,
    description: description || fallback.description,
    ...(image ? { openGraph: { ...fallback.openGraph, images: [{ url: image }] } } : {}),
    ...(canonical ? { alternates: { ...fallback.alternates, canonical } } : {}),
  };
}

export async function spaceContent(id: string) {
  return getContent(`venue.${id}`, await getLocale());
}
