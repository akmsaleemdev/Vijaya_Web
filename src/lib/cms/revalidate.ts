import { revalidatePath, revalidateTag } from "next/cache";
import { contentTag, COPY_BUNDLE_TAG } from "./tags";

export function invalidateContent(key: string) {
  revalidateTag(contentTag(key), { expire: 0 });
  if (key.startsWith("copy.")) revalidateTag(COPY_BUNDLE_TAG, { expire: 0 });
  if (key.startsWith("venue.")) {
    revalidateTag("venues", { expire: 0 });
    revalidatePath("/spaces/" + key.slice(6));
    revalidatePath("/spaces");
    revalidatePath("/");
  } else if (key === "gallery.items") {
    revalidatePath("/gallery");
  } else if (key === "home.hero" || key === "page.home") {
    revalidatePath("/");
  } else if (key.startsWith("page.")) {
    revalidatePath("/" + key.slice(5).replaceAll(".", "/"));
  } else {
    // Shared chrome, settings and feature flags affect multiple route trees.
    // Locales are negotiated on the same paths.
    revalidatePath("/", "layout");
  }
}
