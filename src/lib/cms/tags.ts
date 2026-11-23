export const CONTENT_TAG = "vijaya-content";
export const COPY_BUNDLE_TAG = "vijaya-component-copy";

export function contentTag(key: string) {
  if (key.startsWith("page.")) return "content:" + key.slice(5);
  if (key.startsWith("venue.")) return "venue:" + key.slice(6);
  if (key === "gallery.items") return "gallery";
  if (key === "home.hero") return "content:home";
  if (key === "site.settings") return "settings";
  if (key === "site.navigation") return "header";
  if (key === "site.footer" || key === "site.contact") return "footer";
  return key;
}
