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
