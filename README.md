# VIJAYA International Convention Centre — Website

Production website for VIJAYA International Convention Centre, Thiruvalla, Kerala.
A premium destination for weddings, celebrations and business events.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
shadcn/ui · Prisma (SQLite) · next-intl · Framer Motion · z-ai-web-dev-sdk

---

## Requirements

- **Bun** (recommended) or Node.js 20+
- ffmpeg (only if you need to re-encode the hero video — already provided in `public/media/`)

## Quick start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env

# 3. Set up the database (creates db/custom.db from prisma/schema.prisma)
bunx prisma generate
bunx prisma db push
bunx prisma db seed

# 4. Run the dev server
bun run dev
# → http://localhost:3000
```

## Production build

```bash
bun run build
node .next/standalone/server.js
# → http://localhost:3000
```

The build uses `output: "standalone"` (see `next.config.ts`), so
`.next/standalone/` contains a self-contained server including only the
production dependencies. Copy `.next/standalone/`, `.next/static/`, and
`public/` to your deployment target.

## Project structure

```
src/
  app/
    (site)/            # Public marketing pages (homepage, weddings, business, …)
      spaces/[slug]/   # Periyar, Nila, Kabani, Boardroom, Hospitality, VIP Dining
    book/              # Booking flow + sandbox payment gateway
    my-vijaya/         # Customer portal (dashboard, bookings, payments, support)
    api/               # REST API routes (booking, availability, CRM, payment, …)
    layout.tsx         # Root layout — fonts (next/font/local), metadata
    globals.css        # Tailwind + design tokens (burgundy/gold/ivory)
  components/
    media/             # HeroBackground (deferred responsive video), Media (next/image)
    gallery/           # Lazy-loaded gallery grid + lightbox
    booking/           # Check-date wizard, venue cards, sticky CTAs
    layout/            # Site header + footer + page hero
    motion/            # Reveal / parallax / hero text animations
    ui/                # shadcn/ui primitives
  lib/                 # Site config, data, fonts, analytics, prisma client
  hooks/               # React hooks
prisma/                # schema.prisma + seed.ts
public/
  media/               # Hero video variants (desktop/mobile), photography, poster
  brand/               # Official logos (burgundy, gold, white)
scripts/               # Build/deploy/encode helpers (see below)
next.config.ts         # Standalone output, AVIF/WebP, immutable cache headers
tailwind.config.ts     # Brand color tokens
```

## Performance

The site is optimized for fast initial load and mobile performance:

- **Hero video** — re-encoded into desktop (960×540, ~5.5 MB) and mobile
  (640×360, ~2.1 MB) variants. `<source media>` picks the right file per
  viewport, and loading is deferred past LCP (`window.load` + idle callback)
  so zero video bytes are requested before the poster is interactive.
- **Fonts** — Poppins via `next/font/local` (4 weights, latin subset, preloaded,
  `font-display: swap`).
- **Images** — all imagery flows through `next/image` (AVIF/WebP, responsive
  `srcset`, lazy below-the-fold, reserved aspect ratios).
- **Caching** — immutable 1-year `Cache-Control` on hashed `/_next/static`,
  30-day immutable on `/media` and `/brand`.
- **360 / virtual tour** — intentionally hidden (`SHOW_VIRTUAL_TOUR = false` in
  `src/lib/site-config.ts`); the `three.js` panorama chunk is dynamically
  imported and excluded from all public-page bundles.

## Useful scripts

```bash
bash scripts/encode_hero_video.sh        # Re-encode hero video from a source MP4
bash scripts/p0_deploy_prod.sh           # Build + deploy standalone production server
bun run scripts/gen_perf_report.js       # Regenerate the performance report docx
```

## Notes

- This archive **excludes** `node_modules/`, `.next/`, `.git/`, the production
  SQLite database (`db/custom.db`), and the real `.env`. Run `bun install` and
  the database setup steps above to get a running copy.
- The production database is excluded to avoid shipping customer data; the
  schema and seed in `prisma/` recreate the structure with sample data.
- Official VIJAYA branding (burgundy / gold / white logos) is in `public/brand/`.
  Do not reintroduce the legacy VICC logos.
