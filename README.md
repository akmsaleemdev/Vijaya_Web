# VIJAYA International Convention Centre — Website

Production website for VIJAYA International Convention Centre, Thiruvalla, Kerala.
A premium destination for weddings, celebrations and business events.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
shadcn/ui · Prisma (PostgreSQL) · next-intl · Framer Motion · z-ai-web-dev-sdk

---

## Supabase and Vercel deployment

Follow the [step-by-step deployment guide](docs/SUPABASE-VERCEL.md) to create
Supabase PostgreSQL and Storage, apply Prisma migrations, import existing
SQLite data if needed, and deploy to Vercel.

The public booking flow accepts unpaid requests by default. Pending approval
reserves the venue until staff confirm, reject or cancel the request. The Super
Admin can select the sandbox simulator on a test deployment and store encrypted
test credentials for planned Razorpay or Stripe integration.

For local development use Node.js 22. Configure `.env` from `.env.example`, run
`npm ci`, `npm run db:deploy`, `npm run db:seed`, and then `npm run dev`.
Use `npm run build:standalone` and `npm start` for self-hosted standalone
deployments. The regular `npm run build` targets the Next.js build used by Vercel.

The application expires abandoned temporary holds when reading availability or
creating a reservation. A trusted scheduler can also call
`POST /api/internal/expire-holds` with the configured `CRON_SECRET` bearer token.

## Content

Publish content from **Website content**. The CMS exposes editable defaults and
stores drafts and version history. The public pages read published records and
fall back to their original content. Draft preview is available from the CMS while
signed in. Malayalam records are selected for Malayalam browser preferences, with
English source content as fallback. Use `venue.<slug>` for venue fields such as
`name`, `shortDescription`, `longDescription`, `heroImage`, `heroImageAlt`, and
newline-separated `gallery`, `galleryAlts` or `amenities`. The media library
returns local URLs for use in the CMS. Set page-level metadata on a page content
entry using `seo.title`, `seo.description`, `seo.ogImage`, and `seo.canonical`.

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
- **360 / virtual tour** — intentionally hidden (off by default and editable in Settings); the `three.js` panorama chunk is dynamically
  imported and excluded from all public-page bundles.

## Useful scripts

```bash
bash scripts/encode_hero_video.sh        # Re-encode hero video from a source MP4
bash scripts/p0_deploy_prod.sh           # Build + deploy standalone production server
node scripts/gen_perf_report.js       # Regenerate the performance report docx
```

## Notes

- This archive **excludes** `node_modules/`, `.next/`, `.git/`, legacy
  SQLite databases and backups, and the real `.env`. Run `npm ci` and
  the database setup steps above to get a running copy.
- The production database is excluded to avoid shipping customer data; the
  schema and seed in `prisma/` recreate the structure with sample data.
- Official VIJAYA branding (burgundy / gold / white logos) is in `public/brand/`.
  Do not reintroduce the legacy VICC logos.
