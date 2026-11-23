export type CopyValues = Record<string, string>;
export type CopyBundle = Record<string, CopyValues>;

function localMedia(value: string) {
  return /^\/(?:media|brand|api\/media)\/[^\\?#]+(?:\?v=[a-f0-9]+)?$/i.test(value) &&
    !value.split("/").some((segment) => /^\.{1,2}$/.test(segment));
}

export function copyFrom(values: CopyValues = {}) {
  return (field: string, fallback: string) => {
    const value = values[field];
    if (typeof value !== "string") return fallback;
    if (/^(?:src|image|poster|posterImage)\./.test(field) || field === "seo.ogImage") {
      return localMedia(value) ? value : fallback;
    }
    if (field === "seo.canonical") return /^https:\/\//i.test(value) || /^\/(?![\\/])/.test(value) ? value : fallback;
    return value;
  };
}
