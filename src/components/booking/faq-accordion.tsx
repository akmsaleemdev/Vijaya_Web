"use client";
import { useCmsCopy } from "@/lib/cms/client";


import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";
import type { FaqItem } from "@/lib/data/content";

const GROUPS: FaqItem["group"][] = ["Booking", "Planning", "Facilities", "Policies"];

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const cmsCopy = useCmsCopy("copy.components.booking.faq-accordion");
  const [group, setGroup] = useState<FaqItem["group"] | "All">("All");
  const filtered = group === "All" ? items : items.filter((i) => i.group === group);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label={cmsCopy("aria-label.faq-groups", "FAQ groups")}>
        {(["All", ...GROUPS] as const).map((g) => (
          <button
            key={g}
            role="tab"
            aria-selected={group === g}
            onClick={() => setGroup(g)}
            className={`chip cursor-pointer transition-all duration-300 ${group === g ? "!bg-burgundy !text-ivory !border-burgundy" : "hover:!border-burgundy/40"}`}
          >
            {g}
          </button>
        ))}
      </div>
      <Accordion type="single" collapsible className="w-full">
        {filtered.map((item, i) => (
          <AccordionItem key={item.q} value={`item-${i}`} className="border-border">
            <AccordionTrigger className="text-left text-[15px] font-normal hover:no-underline hover:text-burgundy transition-colors py-5">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-[14px] font-light leading-7 text-stone pb-5">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
