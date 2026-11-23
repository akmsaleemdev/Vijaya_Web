# VIJAYA changelog

## Live CMS seeding

- Seeded the existing editor-managed copy, venue records, menus, FAQ, gallery, experiences, and SEO metadata. Added typed draft and published reads with targeted revalidation, locale fallback, and a short cache TTL.
- Converted reservation statuses, prices, timestamps, and content payloads to native PostgreSQL types. Added UTC range exclusions to bookings and the shared physical-slot ledger.
- Split public media and private documents into separate Supabase Storage buckets and added file version hashes.

## Supabase, Vercel and offline reservations

- Configured Supabase PostgreSQL with a private schema and an exclusion constraint for overlapping venue sessions. Archived SQLite migrations and added a transactional data importer.
- Replaced the Prisma runtime and schema with parameterized PostgreSQL queries, SQL migrations, and direct-SQL seed and maintenance scripts.
- Made unpaid requests with staff approval the default booking flow. Added sandbox switching and encrypted Razorpay and Stripe test credential settings for Super Admins.
- Added Supabase Storage for persistent CMS media on Vercel and documented migration, seeding and deployment.

## Admin CMS and booking integrity

- Added `/admin/login`, `/admin/password`, and role-scoped dashboards for bookings, calendar, venues, content, media, enquiries, customers, payments, notifications, people and audit history.
- Added `/api/admin/*`, `/api/auth/*`, `GET /api/availability`, `GET /api/media/[file]`, and `POST /api/internal/expire-holds`. The existing booking, checkout, CRM, portal and sandbox payment endpoints share the upgraded occupancy rules.
- Extended `Space`, `Booking`, `Payment`, `Lead`, `AuditLog` and `SlotState`. Added `AdminUser`, `AdminSession`, `LoginAttempt`, `SessionConfig`, `ContentEntry`, `ContentVersion`, `MediaAsset`, `CustomerNote`, `BookingNote` and `EmailLog`.
- Added SQLite overlap triggers on `SlotState` alongside its unique physical venue/date/session index. The triggers cover overlapping custom sessions and full-day reservations while permitting adjacent sessions.
- Added environment settings for NextAuth, bootstrap credentials, session age, holds, protected expiry, trusted proxy IPs, media storage, SMTP and sandbox flags. See `.env.example`.
