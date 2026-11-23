"use client";
import { useCmsCopy } from "@/lib/cms/client";


import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import { track } from "@/lib/analytics";

/** Sticky bottom CTA on space detail pages (mobile-first, desktop too). */
export function StickySpaceCTA({ slug, name }: { slug: string; name: string }) {
  const cmsCopy = useCmsCopy("copy.components.booking.sticky-space-cta");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-500 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="bg-ink/95 backdrop-blur-md text-ivory">
        <div className="container-editorial flex items-center justify-between gap-4 py-3">
          <p className="text-sm font-light truncate">
            <span className="text-gold uppercase tracking-[0.16em] text-[10px] block">{name}</span>{cmsCopy("text.check-your-date-or-book-this-space", "Check your date or book this space")}</p>
          <div className="flex gap-3 shrink-0">
            <Link href={`/check-your-date?venue=${slug}`} onClick={() => track("hero_check_date_click", { source: "sticky_space" })} className="btn-gold !min-h-[42px] !px-5 !text-[11px]">
              <CalendarCheck className="h-4 w-4" />
              <span className="hidden sm:inline">{cmsCopy("text.check-date", "Check Date")}</span>
              <span className="sm:hidden">{cmsCopy("text.date", "Date")}</span>
            </Link>
            <Link href={`/check-your-date?venue=${slug}`} className="btn-primary !min-h-[42px] !px-5 !text-[11px] hidden sm:inline-flex">
              <span>{cmsCopy("text.book", "Book")}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
