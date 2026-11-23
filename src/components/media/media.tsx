"use client";

import { useCmsCopy } from "@/lib/cms/client";
import Image from "next/image";
import { SHOW_MEDIA_PLACEHOLDER_TAGS } from "@/lib/site-config";

/**
 * Media with an honest "Placeholder visual" tag until official VIJAYA
 * photography / video replaces it. Uses next/image with fill — wrap in a
 * positioned parent.
 */
export function Media({
  src,
  alt,
  className,
  sizes = "100vw",
  priority = false,
  tag = true,
  quality = 75,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  tag?: boolean;
  quality?: number;
}) {
  const cmsCopy = useCmsCopy("copy.components.media.media");
  return (
    <>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} quality={quality} className={`object-cover ${className || ""}`} />
      {tag && SHOW_MEDIA_PLACEHOLDER_TAGS && <span className="badge-placeholder">{cmsCopy("text.placeholder-visual", "Placeholder visual")}</span>}
    </>
  );
}
