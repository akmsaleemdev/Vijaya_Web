# VIJAYA website and CMS audit

Baseline: GitHub main at abfbc77. The supplied frontend preview and source agree on the homepage navigation and hero. The source contains official logos and public pages, including space detail, enquiry forms, booking checkout, and My VIJAYA.

## Data and booking

| Existing Prisma model | Current responsibility |
| --- | --- |
| Space | Seeded venue inventory and basic booking flags |
| SlotState | Operational occupancy, unique by space/date/slot. Named slots currently fail to model full-day overlap. |
| Booking | Hold/customer details, event date and named slot, quoted rupee amounts, status, combo children, and CRM sync |
| Payment | Sandbox payments, unique provider reference and idempotency key |
| Lead | Online enquiries, event or visit information, CRM stage |
| Document, Milestone | Customer portal confirmation, invoice, receipt, agreement and planning timeline |
| SupportTicket, AnalyticsEvent | Portal help requests and site metrics |
| AuditLog | Booking event history with no actor field |

The date wizard checks compatible spaces and a monthly rollup, then requests a hold. Checkout collects customer details and sends the user to a sandbox gateway. Customer portal, checkout, and payment read the same booking. Current expiry can leave pending-payment locks behind. Cancellation deletes locks separately from its status update. CRM sync writes directly to SlotState. A shared occupancy invariant is required across these paths and any new admin booking operations.

## Public content

Homepage hero, highlights, statistics and CTAs live in the home component. Wedding, business, celebrations, experiences, about, contact, global desk, FAQ and legal copy live in their route components, with data shared in `src/lib/data/content.ts`. Gallery data lives in that same module. Space descriptions, imagery, capacity, combos and sample pricing live in `src/lib/data/spaces.ts`. Navigation, contacts, booking defaults and the disabled virtual tour flag live in `src/lib/site-config.ts`. SEO is spread across page-level metadata, the root layout, sitemap and robots. No active next-intl configuration or message catalog was found. English is the source fallback.

## Authentication and integrations

The portal uses its own signed cookie. There is no CMS user model, admin session, or admin middleware. Public lead forms persist through the lead-capture helper. The concierge and analytics have separate API routes. No live gateway or outbound CRM integration is configured. The baseline contains hard-coded development fallback secrets and skips TypeScript checking during the production build. The repository excludes the live SQLite file and contains no migration history or environment template.

## Migration approach

Create a baseline migration from the original schema, then apply additive CMS changes and database overlap guards. Reuse Space, Booking, Payment, Lead, AuditLog and SlotState. Keep existing field names and statuses compatible with checkout and the portal. Back up an existing installation before recording the baseline and applying the upgrade. No production database is available in this checkout. For a future PostgreSQL migration, use a range exclusion constraint on physical venue and UTC time ranges, retain transactions, and verify existing conflicts before switching.

## Supabase live CMS audit

Reviewed GitHub main at `cff58ff`, the attached SQLite-era schema and seed, the Prisma PostgreSQL migration and import path, and the admin and public booking routes. The attached files predate the CMS, role model, dual pooler configuration, overlap constraint and offline request state. They are reference material for legacy data. The repository's PostgreSQL schema and idempotent venue and Super Admin seed are the migration baseline.

The latest public layout reads some CMS records but the database seed creates only venue inventory and staff credentials. Shared components, venue details, root structured data and operational copy still use original source literals. `CONTENT_INVENTORY.md` records the source and public surface. The existing cache has one global tag and a 60-second TTL. CMS uploads use one private Storage bucket with a local fallback for standalone use.

Occupancy is stored per physical venue in `SlotState`. A PostgreSQL exclusion constraint rejects overlapping physical coverage, including grouped venues, blocks and unpaid pending approvals. The API wraps state transitions in a transaction and lazily expires holds. Confirming an unpaid request remains a staff operation. Existing Supabase application tables are already RLS-enabled in the private `vijaya` schema. Admin login uses NextAuth credentials plus role and session checks.
