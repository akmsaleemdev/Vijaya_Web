# VIJAYA changelog

## Admin CMS and booking integrity

- Added `/admin/login`, `/admin/password`, and role-scoped dashboards for bookings, calendar, venues, content, media, enquiries, customers, payments, notifications, people and audit history.
- Added `/api/admin/*`, `/api/auth/*`, `GET /api/availability`, `GET /api/media/[file]`, and `POST /api/internal/expire-holds`. The existing booking, checkout, CRM, portal and sandbox payment endpoints share the upgraded occupancy rules.
- Extended `Space`, `Booking`, `Payment`, `Lead`, `AuditLog` and `SlotState`. Added `AdminUser`, `AdminSession`, `LoginAttempt`, `SessionConfig`, `ContentEntry`, `ContentVersion`, `MediaAsset`, `CustomerNote`, `BookingNote` and `EmailLog`.
- Added SQLite overlap triggers on `SlotState` alongside its unique physical venue/date/session index. The triggers cover overlapping custom sessions and full-day reservations while permitting adjacent sessions.
- Added environment settings for NextAuth, bootstrap credentials, session age, holds, protected expiry, trusted proxy IPs, media storage, SMTP and sandbox flags. See `.env.example`.
