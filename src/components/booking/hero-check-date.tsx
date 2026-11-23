"use client";

import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { track } from "@/lib/analytics";

export function HeroCheckDate({ source = "hero", label = "Check Your Date", variant = "primary", href = "/check-your-date" }: { source?: string; href?: string; label?: string; variant?: "primary" | "gold" }) {
  return (
    <Link
      href={href}
      onClick={() => track("hero_check_date_click", { source })}
      className={variant === "gold" ? "btn-gold" : "btn-primary"}
    >
      <CalendarCheck className="h-4 w-4" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
