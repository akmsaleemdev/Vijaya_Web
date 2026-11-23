"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track, type AnalyticsEventName } from "@/lib/analytics";

/** Link wrapper that records an analytics event on click (client-side). */
export function TrackLink({
  href,
  event,
  meta,
  className,
  children,
  ariaLabel,
}: {
  href: string;
  event: AnalyticsEventName;
  meta?: Record<string, unknown>;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Link href={href} onClick={() => track(event, meta)} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
