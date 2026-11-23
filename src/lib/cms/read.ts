import { cache } from "react";
import { unstable_cache } from "next/cache";
import { draftMode, headers } from "next/headers";
import { db } from "@/lib/db";
import { contentTag, CONTENT_TAG, COPY_BUNDLE_TAG } from "./tags";
import { copyFrom, type CopyBundle, type CopyValues } from "./copy";
import clientScopes from "./client-scopes.json";

export const getLocale = cache(async () => {
  try {
    const language = (await headers()).get("accept-language")?.split(",")[0]?.toLowerCase();
    return language?.startsWith("ml") ? "ml" : "en";
  } catch {
    return "en";
  }
});

const canSeeDraft = cache(async () => {
  try {
    if (!(await draftMode()).isEnabled) return false;
    const { currentAdmin } = await import("@/lib/admin/auth");
    const admin = await currentAdmin();
    return !!admin && !admin.mustChangePassword && admin.role !== "VIEWER";
  } catch {
    return false;
  }
});

function selectValues(key: string, locale: string, preview = false) {
  return db.contentEntry.findMany({
    where: { key, locale: { in: locale === "en" ? ["en"] : [locale, "en"] } },
    select: preview ? { locale: true, draft: true, published: true } : { locale: true, published: true },
  });
}

function merge(base: unknown, localized: unknown): unknown {
  if (localized == null) return base;
  if (typeof base === "object" && base && !Array.isArray(base) &&
      typeof localized === "object" && localized && !Array.isArray(localized)) {
    return { ...base, ...localized };
  }
  return localized;
}

function decodeContent(value: unknown) {
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return null; }
}

export const getContent = cache(async (key: string, locale: string): Promise<unknown> => {
  try {
    const preview = await canSeeDraft();
    const rows = preview ? await selectValues(key, locale, true) : await unstable_cache(
      () => selectValues(key, locale), ["vijaya-copy-v2", key, locale],
      { tags: [CONTENT_TAG, contentTag(key)], revalidate: 5 },
    )();
    const forLocale = (lang: string) => {
      const entry = rows.find((row) => row.locale === lang);
      return decodeContent(preview && entry && "draft" in entry ? entry.draft : entry?.published);
    };
    return locale === "en" ? forLocale("en") : merge(forLocale("en"), forLocale(locale));
  } catch {
    return null;
  }
});

function textValues(value: unknown): CopyValues {
  return Object.fromEntries(Object.entries(value && typeof value === "object" && !Array.isArray(value) ? value : {})
    .filter((item): item is [string, string] => typeof item[1] === "string"));
}

export async function getPageContent(page: string, locale?: string) {
  return copyFrom(textValues(await getContent("page." + page, locale ?? await getLocale())));
}

export async function getComponentCopy(key: string) {
  return copyFrom(textValues(await getContent(key, await getLocale())));
}

export const getCopyBundle = cache(async (surface: "site" | "book" | "portal"): Promise<CopyBundle> => {
  try {
    const locale = await getLocale();
    const preview = await canSeeDraft();
    const keys = clientScopes.filter((key) => {
      if (surface === "book") return key.includes(".checkout.") || key.startsWith("copy.app.book.");
      if (surface === "portal") return key.includes(".portal.") || key.startsWith("copy.app.my-vijaya.");
      return !key.includes(".checkout.") && !key.includes(".portal.") && !key.startsWith("copy.app.book.") && !key.startsWith("copy.app.my-vijaya.");
    });
    const find = () => db.contentEntry.findMany({ where: { key: { in: keys }, locale: { in: ["en", locale] } } });
    const rows = preview ? await find() : await unstable_cache(find, ["vijaya-client-copy-v2", surface, locale], {
      tags: [CONTENT_TAG, COPY_BUNDLE_TAG], revalidate: 5,
    })();
    return Object.fromEntries(keys.map((key) => {
      const get = (lang: string) => {
        const entry = rows.find((row) => row.key === key && row.locale === lang);
        return decodeContent(preview ? entry?.draft : entry?.published);
      };
      return [key, textValues(locale === "en" ? get("en") : merge(get("en"), get(locale)))];
    }));
  } catch {
    return {};
  }
});
