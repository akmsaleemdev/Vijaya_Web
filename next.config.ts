import type { NextConfig } from "next";

const storageHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : null;

const nextConfig: NextConfig = {
  output: process.env.VERCEL === "1" ? undefined : "standalone",
  images: {
    remotePatterns: storageHost ? [{ protocol: "https", hostname: storageHost, pathname: "/storage/v1/object/public/**" }] : [],
    // Serve modern formats first: AVIF (~50% smaller than JPEG) where the
    // browser supports it, WebP as the universal fallback.
    formats: ["image/avif", "image/webp"],
    qualities: [75, 92, 95],
  },
  experimental: { authInterrupts: true },
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
    const adminHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") + "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'" },
    ];
    return [
      { source: "/admin/:path*", headers: adminHeaders },
      { source: "/api/admin/:path*", headers: adminHeaders },
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
