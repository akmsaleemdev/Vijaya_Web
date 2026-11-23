DO $$
BEGIN
  IF current_schema() <> 'vijaya' THEN
    RAISE EXCEPTION 'Connect with schema=vijaya in the PostgreSQL connection URL.';
  END IF;
END $$;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Space" (
    "id" TEXT NOT NULL,
    "crmVenueId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "setting" TEXT NOT NULL,
    "capacityMin" INTEGER,
    "capacityMax" INTEGER,
    "bookableOnline" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "availabilityEnabled" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "pricingJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotState" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ONLINE',
    "holdExpiresAt" TIMESTAMP(3),
    "bookingRef" TEXT,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "groupId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "spaceName" TEXT NOT NULL,
    "childSpaceIds" TEXT,
    "eventType" TEXT NOT NULL,
    "eventDate" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "guests" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "crmSync" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "createdById" TEXT,
    "requestKey" TEXT,
    "requestHash" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "customerCountry" TEXT NOT NULL DEFAULT 'India',
    "notes" TEXT,
    "baseAmount" INTEGER NOT NULL,
    "weekendUplift" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "totalPayable" INTEGER NOT NULL,
    "addons" TEXT,
    "holdExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'SANDBOX',
    "providerRef" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT,
    "transactionId" TEXT,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'New Lead',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "country" TEXT,
    "eventType" TEXT,
    "eventDate" TEXT,
    "slot" TEXT,
    "guests" INTEGER,
    "venueInterest" TEXT,
    "setting" TEXT,
    "visitDate" TEXT,
    "visitTime" TEXT,
    "message" TEXT,
    "source" TEXT NOT NULL DEFAULT 'website',
    "internalNotes" TEXT,
    "followUpAt" TIMESTAMP(3),
    "utmJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "dueDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "bookingRef" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "sessionId" TEXT,
    "metaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityRef" TEXT NOT NULL,
    "actorId" TEXT,
    "ip" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "detailJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ContentEntry" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "draft" TEXT NOT NULL,
    "published" TEXT,
    "editedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "alt" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingNote" (
    "id" TEXT NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionConfig" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SessionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'OFFLINE',
    "provider" TEXT NOT NULL DEFAULT 'SIMULATOR',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayCredential" (
    "provider" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "encrypted" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatewayCredential_pkey" PRIMARY KEY ("provider")
);

-- CreateIndex
CREATE INDEX "SlotState_date_slot_idx" ON "SlotState"("date", "slot");

-- CreateIndex
CREATE INDEX "SlotState_bookingRef_idx" ON "SlotState"("bookingRef");

-- CreateIndex
CREATE UNIQUE INDEX "SlotState_spaceId_date_slot_key" ON "SlotState"("spaceId", "date", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_requestKey_key" ON "Booking"("requestKey");

-- CreateIndex
CREATE INDEX "Booking_customerEmail_idx" ON "Booking"("customerEmail");

-- CreateIndex
CREATE INDEX "Booking_eventDate_idx" ON "Booking"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Lead_type_idx" ON "Lead"("type");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_idx" ON "AnalyticsEvent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEntry_key_locale_key" ON "ContentEntry"("key", "locale");

-- CreateIndex
CREATE INDEX "ContentVersion_entryId_createdAt_idx" ON "ContentVersion"("entryId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerNote_email_idx" ON "CustomerNote"("email");

-- CreateIndex
CREATE INDEX "BookingNote_bookingRef_idx" ON "BookingNote"("bookingRef");

-- CreateIndex
CREATE UNIQUE INDEX "SessionConfig_spaceId_key_key" ON "SessionConfig"("spaceId", "key");

-- CreateIndex
CREATE INDEX "AdminSession_adminId_idx" ON "AdminSession"("adminId");

-- AddForeignKey
ALTER TABLE "SlotState" ADD CONSTRAINT "SlotState_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentVersion" ADD CONSTRAINT "ContentVersion_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContentEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Supabase commonly installs extensions in a separate schema. This also
-- supports a plain PostgreSQL installation.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
SET search_path TO vijaya, extensions, public;

ALTER TABLE "SlotState"
  ADD CONSTRAINT "SlotState_valid_interval"
  CHECK (
    ("startMinute" IS NULL AND "endMinute" IS NULL)
    OR ("startMinute" IS NOT NULL AND "endMinute" IS NOT NULL
      AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "startMinute" < "endMinute")
  );

-- Adjacent sessions are allowed. A full day overlaps all same-day sessions.
-- Legacy rows use their original session boundaries if minutes are absent.
ALTER TABLE "SlotState"
  ADD CONSTRAINT "SlotState_no_overlap"
  EXCLUDE USING gist (
    "spaceId" WITH =,
    "date" WITH =,
    int4range(
      COALESCE("startMinute", CASE "slot" WHEN 'MORNING' THEN 420 WHEN 'AFTERNOON' THEN 780 WHEN 'EVENING' THEN 1080 ELSE 0 END),
      COALESCE("endMinute", CASE "slot" WHEN 'MORNING' THEN 780 WHEN 'AFTERNOON' THEN 1080 WHEN 'EVENING' THEN 1380 ELSE 1440 END),
      '[)'
    ) WITH &&
  ) WHERE ("status" <> 'CANCELLED');

REVOKE ALL ON SCHEMA vijaya FROM PUBLIC;
DO $$
DECLARE relation record;
BEGIN
  FOR relation IN SELECT tablename FROM pg_tables
    WHERE schemaname = 'vijaya' AND tablename <> '_app_migrations'
  LOOP
    EXECUTE format('ALTER TABLE vijaya.%I ENABLE ROW LEVEL SECURITY', relation.tablename);
  END LOOP;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA vijaya FROM anon;
    REVOKE ALL ON ALL TABLES IN SCHEMA vijaya FROM anon;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON SCHEMA vijaya FROM authenticated;
    REVOKE ALL ON ALL TABLES IN SCHEMA vijaya FROM authenticated;
  END IF;
END $$;
SET search_path TO vijaya;
