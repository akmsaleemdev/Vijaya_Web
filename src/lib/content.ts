import { draftMode, headers } from "next/headers";
import { unstable_cache } from "next/cache";
import type { z } from "zod";
import { db } from "@/lib/db";
import { contentSchemas } from "@/lib/admin/content-schema";

export const CONTENT_TAG = "vijaya-content";
const publishedContent = unstable_cache(async (key: string, locale: string) => db.contentEntry.findUnique({
  where: { key_locale: { key, locale } }, select: { published: true },
}).then((entry) => entry?.published ?? null), ["content-v1"], { tags: [CONTENT_TAG], revalidate: 60 });

async function read(key: string, locale: string) {
  try {
    if ((await draftMode()).isEnabled) {
      const { currentAdmin } = await import("@/lib/admin/auth");
      const admin = await currentAdmin();
      if (admin && !admin.mustChangePassword && admin.role !== "VIEWER") {
        const entry = await db.contentEntry.findUnique({ where: { key_locale: { key, locale } }, select: { draft: true } });
        if (entry) return entry.draft;
      }
    }
    return await publishedContent(key, locale) ?? (locale !== "en" ? await publishedContent(key, "en") : null);
  } catch {
    // Static site content is still served when the CMS database is unavailable.
    return null;
  }
}

async function visitorLocale() {
  const language = (await headers()).get("accept-language")?.split(",")[0]?.toLowerCase();
  return language?.startsWith("ml") ? "ml" : "en";
}

export async function siteContent<K extends keyof typeof contentSchemas>(key: K, locale?: string): Promise<z.output<(typeof contentSchemas)[K]> | null> {
  const value = await read(key, locale ?? await visitorLocale());
  if (!value) return null;
  const result = contentSchemas[key].safeParse(JSON.parse(value));
  return result.success ? result.data as z.output<(typeof contentSchemas)[K]> : null;
}

export async function pageCopy(key: string) {
  const value = await read(`page.${key}`, await visitorLocale());
  const parsed: Record<string, unknown> = value ? JSON.parse(value) : {};
  return (field: string, fallback: string) => {
    const value = parsed[field];
    if (typeof value !== "string") return fallback;
    if (/^(?:src|image|posterImage)\./.test(field) || field === "seo.ogImage" || field === "seo.canonical") {
      return /^\/(?![\/])/.test(value) && !value.includes("\\") || /^https:\/\//i.test(value) && field === "seo.canonical" ? value : fallback;
    }
    return value;
  };
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

export async function spaceContent(id: string): Promise<Record<string, string>> {
  const value = await read(`venue.${id}`, await visitorLocale());
  return value ? JSON.parse(value) : {};
}
