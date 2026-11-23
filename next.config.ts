import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Serve modern formats first: AVIF (~50% smaller than JPEG) where the
    // browser supports it, WebP as the universal fallback.
    formats: ["image/avif", "image/webp"],
    qualities: [75, 92, 95],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async redirects() {
    return [
      // Ballroom entity retired and replaced by Hospitality / Luxury Rooms.
      // Permanent 308 redirect preserves backward compatibility for any
      // external link, sitemap entry or bookmark still pointing at /spaces/ballroom.
      {
        source: "/spaces/ballroom",
        destination: "/spaces/hospitality",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Hashed build assets (JS/CSS chunks, optimized next/image output) —
        // filenames include a content hash, so they are safe to cache
        // immutably for a year. Repeat visits + page navigation become
        // near-instant because nothing is re-downloaded.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Self-hosted hero video (MP4s), poster and brand logos — stable
        // paths. Cached for 30 days immutable; re-encoding a video means
        // renaming the file, so immutability is safe.
        source: "/media/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, immutable" },
        ],
      },
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
