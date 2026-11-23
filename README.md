# VIJAYA International Convention Centre — Website

Production website for VIJAYA International Convention Centre, Thiruvalla, Kerala.
A premium destination for weddings, celebrations and business events.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 ·
shadcn/ui · Prisma (SQLite) · next-intl · Framer Motion · z-ai-web-dev-sdk

---

## Requirements

- Node.js 20.19+ with npm. Bun can run the application as well.
- A persistent writable volume for SQLite and media in production.
- ffmpeg is only needed to re-encode the supplied hero video.

## Quick start

```bash
npm ci
cp .env.example .env
mkdir -p db
touch db/custom.db
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Set `NEXTAUTH_SECRET` and `AUTH_SECRET` to independently generated random secrets. Set
`SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in the environment before running the seed.
The initial account signs in at `/admin/login` and must change its temporary password
before accessing the CMS. The seed preserves edits to existing venues and credentials
of an existing Super Admin. Remove the bootstrap password from the process environment
after provisioning. `SEED_DEMO_DATA=true` is available for local demos only.

| Role | Access |
| --- | --- |
| Super Admin | All workspaces, exports, settings, users and audit |
| Manager | Bookings, calendar, venues, content, media, enquiries, customers and payments |
| Editor | Content and media |
| Viewer | Read-only overview, bookings and calendar |

Sessions expire after 30 minutes of inactivity and have a configurable absolute lifetime.
Password changes, resets and role changes revoke previous sessions. For meaningful
per-IP throttling behind a reverse proxy, set `TRUSTED_CLIENT_IP_HEADER` to a header whose
value the proxy overwrites on every request. Requests without trusted IP information
share a fallback rate-limit bucket.

## Existing SQLite installations

Stop writers during the migration. Use a SQLite backup from the active database,
including any committed writes in its WAL. Save uploads separately. Run this on a
copy first and compare booking, payment and lead counts before and after.

```bash
sqlite3 db/custom.db ".backup '/secure/backups/vijaya-before-admin.db'"
sqlite3 /secure/backups/vijaya-before-admin.db "PRAGMA integrity_check;"
```

When the existing database exactly matches the schema of the original commit and
has no migration history, mark the baseline as applied, then apply the CMS migration.

```bash
npx prisma migrate resolve --applied 202611230001_baseline
npm run db:deploy
npm run db:seed
```

A fresh database should run `db:deploy` directly without `migrate resolve`.
Before promoting an existing database, resolve any overlapping legacy reservations
in the operations calendar. The previous release allowed a full-day slot and a
named slot on the same venue and date to coexist. Check the backup and the source
records with operations before changing either booking. To restore, stop writers,
retain the failed database for investigation, and restore both the SQLite backup
and the matching version of the application and uploads. Keep production databases
and backup files out of Git.

For PostgreSQL, model physical-venue occupancy as half-open UTC time ranges and use
a GiST exclusion constraint per venue. Verify historical overlaps, backfill the
ranges and validate on a copy before switching writers.

## Runtime and operations

```bash
npm run lint
npm run typecheck
npm run build
npm test
npm start
```

Run migration and seed before starting the standalone server. Configure the deployment
process with an absolute `DATABASE_URL=file:/persistent/vijaya/custom.db` and an
absolute `UPLOADS_DIR=/persistent/vijaya/uploads`. The production service needs HTTPS
and `NEXTAUTH_URL` set to its canonical URL. Set `CRON_SECRET` and schedule a
`POST /api/internal/expire-holds` with `Authorization: Bearer <CRON_SECRET>` once
per minute. Availability and hold requests also expire stale holds on demand.

Enable `ENABLE_SANDBOX_PAYMENTS=true` only on test installations. The production
provider and outbound CRM vendor need to be configured separately. Inbound CRM
sync requires `CRM_SYNC_KEY`. SMTP email requires `SMTP_URL` and an approved
`SMTP_FROM`. The admin finance module records offline refunds after the operator
processes them with the payment provider.

The standalone integration suite starts a local server and creates an isolated SQLite
database and random test credentials. It verifies auth and password rotation, hold
contention, full-day conflicts, cancellation, blocks, expiration, idempotency and
publishing with fallback. Set `CMS_TEST_PORT` if port 3713 is already in use.

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

- This archive **excludes** `node_modules/`, `.next/`, `.git/`, the production
  SQLite database (`db/custom.db`), and the real `.env`. Run `npm ci` and
  the database setup steps above to get a running copy.
- The production database is excluded to avoid shipping customer data; the
  schema and seed in `prisma/` recreate the structure with sample data.
- Official VIJAYA branding (burgundy / gold / white logos) is in `public/brand/`.
  Do not reintroduce the legacy VICC logos.
