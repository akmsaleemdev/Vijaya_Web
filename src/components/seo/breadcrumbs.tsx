
import { getComponentCopy } from "@/lib/cms/read";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export async function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const cmsCopy = await getComponentCopy("copy.components.seo.breadcrumbs");
  return (
    <nav aria-label={cmsCopy("aria-label.breadcrumb", "Breadcrumb")} className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-stone">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3 text-stone/50" />}
            {item.href ? (
              <Link href={item.href} className="hover:text-ink transition-colors">{item.label}</Link>
            ) : (
              <span aria-current="page" className="text-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
