"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { Scene360 } from "./panorama-viewer";
import { track } from "@/lib/analytics";
import { useEffect } from "react";

const PanoramaViewer = dynamic(() => import("./panorama-viewer").then((m) => m.PanoramaViewer), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-ink text-ivory/60" style={{ aspectRatio: "16/9" }}>
      <div className="text-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold mx-auto" aria-hidden />
        <p className="mt-3 text-[11px] uppercase tracking-[0.24em]">Loading 360° experience</p>
      </div>
    </div>
  ),
});

export function Panorama360Wrapper({ scenes }: { scenes: Scene360[] }) {
  useEffect(() => {
    track("venue_360_started", { source: "tour_page" });
  }, []);
  return <PanoramaViewer scenes={scenes} />;
}
