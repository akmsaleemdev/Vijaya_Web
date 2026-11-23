import { pageCopy, pageMetadata } from "@/lib/content";
import type { Metadata } from "next";
import { SCENES_360 } from "@/lib/data/content";
import { Panorama360Wrapper } from "@/components/panorama/panorama-360-wrapper";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

const metadata: Metadata = {
  title: "360° Tour",
  description:
    "Step inside VIJAYA — an immersive 360° tour of selected spaces. Drag to look around, zoom and jump between the grand hall, lobby and lake deck.",
};

export default async function Tour360Page() {
  const copy = await pageCopy("360-tour");
  return (
    <main className="bg-ink min-h-screen">
      <div className="container-editorial pt-28 md:pt-36 pb-16">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "360° Tour" }]} />
        <p className="eyebrow">{copy("text.step-inside", "Step Inside")}</p>
        <h1 className="h-display mt-3 text-ivory">{copy("text.experience-vijaya-in-360", "Experience VIJAYA in 360°.")}</h1>
        <p className="lede !text-ivory/70 mt-4 max-w-2xl">{copy("text.walk-selected-spaces-from-anywhere-in-the-world-dr", "Walk selected spaces from anywhere in the world. Drag to look around, scroll to zoom, use the scene selector to jump between spaces, and tap hotspots to move through the destination.")}</p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-ivory/40">{copy("text.placeholder-panoramas-replaced-with-original-insta", "Placeholder panoramas — replaced with original Insta360 equirectangular exports after the official shoot")}</p>
      </div>
      <div className="container-editorial pb-24">
        <Panorama360Wrapper scenes={SCENES_360} />
        <div className="mt-10 grid gap-4 md:grid-cols-3 text-ivory/70 text-[13px] font-light">
          <div className="hairline-t-light pt-4"><span className="text-gold block text-[10px] uppercase tracking-[0.2em] mb-1.5">{copy("text.drag", "Drag")}</span>{copy("text.look-around-each-space", "Look around each space")}</div>
          <div className="hairline-t-light pt-4"><span className="text-gold block text-[10px] uppercase tracking-[0.2em] mb-1.5">{copy("text.scroll-pinch", "Scroll / Pinch")}</span>{copy("text.zoom-into-the-detail", "Zoom into the detail")}</div>
          <div className="hairline-t-light pt-4"><span className="text-gold block text-[10px] uppercase tracking-[0.2em] mb-1.5">{copy("text.hotspots", "Hotspots")}</span>{copy("text.jump-between-spaces", "Jump between spaces")}</div>
        </div>
      </div>
    </main>
  );
}

export const generateMetadata = () => pageMetadata("360-tour", metadata);
