"use client";

import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { track } from "@/lib/analytics";

export function HeroCheckDate({ source = "hero", label = "Check Your Date", variant = "primary" }: { source?: string; label?: string; variant?: "primary" | "gold" }) {
  return (
    <Link
      href="/check-your-date"
      onClick={() => track("hero_check_date_click", { source })}
      className={variant === "gold" ? "btn-gold" : "btn-primary"}
    >
      <CalendarCheck className="h-4 w-4" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
