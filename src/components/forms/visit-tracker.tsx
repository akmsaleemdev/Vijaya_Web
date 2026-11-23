"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Fires venue_visit_started once per mount (client-side analytics). */
export function VisitTracker() {
  useEffect(() => {
    track("venue_visit_started", { source: "page" });
  }, []);
  return null;
}
