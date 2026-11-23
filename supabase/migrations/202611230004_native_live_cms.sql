CREATE TYPE "BookingStatus" AS ENUM ('PENDING_HOLD','PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','CANCELLED','REJECTED','EXPIRED','COMPLETED','NO_SHOW');
CREATE TYPE "SlotStatus" AS ENUM ('TEMPORARY_HOLD','PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','BLOCKED','MAINTENANCE','INTERNAL_USE','CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED','PENDING','SUCCESS','FAILED','REFUNDED');

ALTER TABLE "SlotState" DROP CONSTRAINT "SlotState_no_overlap";
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus"
  USING (CASE WHEN "status" = 'HOLD' THEN 'PENDING_HOLD' ELSE "status" END)::"BookingStatus";
ALTER TABLE "SlotState" ALTER COLUMN "status" TYPE "SlotStatus" USING "status"::"SlotStatus";
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::"PaymentStatus";

ALTER TABLE "Space" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Space" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "SlotState" ALTER COLUMN "holdExpiresAt" TYPE TIMESTAMPTZ(3) USING "holdExpiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "SlotState" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "SlotState" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "Booking" ALTER COLUMN "startAt" TYPE TIMESTAMPTZ(3) USING "startAt" AT TIME ZONE 'UTC';
ALTER TABLE "Booking" ALTER COLUMN "endAt" TYPE TIMESTAMPTZ(3) USING "endAt" AT TIME ZONE 'UTC';
ALTER TABLE "Booking" ALTER COLUMN "baseAmount" TYPE DECIMAL(14,2);
ALTER TABLE "Booking" ALTER COLUMN "weekendUplift" TYPE DECIMAL(14,2);
ALTER TABLE "Booking" ALTER COLUMN "taxAmount" TYPE DECIMAL(14,2);
ALTER TABLE "Booking" ALTER COLUMN "depositAmount" TYPE DECIMAL(14,2);
ALTER TABLE "Booking" ALTER COLUMN "totalPayable" TYPE DECIMAL(14,2);
ALTER TABLE "Booking" ALTER COLUMN "addons" TYPE JSONB USING "addons"::jsonb;
ALTER TABLE "Booking" ALTER COLUMN "holdExpiresAt" TYPE TIMESTAMPTZ(3) USING "holdExpiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "Booking" ALTER COLUMN "confirmedAt" TYPE TIMESTAMPTZ(3) USING "confirmedAt" AT TIME ZONE 'UTC';
ALTER TABLE "Booking" ALTER COLUMN "cancelledAt" TYPE TIMESTAMPTZ(3) USING "cancelledAt" AT TIME ZONE 'UTC';
ALTER TABLE "Booking" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Booking" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "Payment" ALTER COLUMN "amount" TYPE DECIMAL(14,2);
ALTER TABLE "Payment" ALTER COLUMN "paidAt" TYPE TIMESTAMPTZ(3) USING "paidAt" AT TIME ZONE 'UTC';
ALTER TABLE "Payment" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Payment" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "Lead" ALTER COLUMN "followUpAt" TYPE TIMESTAMPTZ(3) USING "followUpAt" AT TIME ZONE 'UTC';
ALTER TABLE "Lead" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Document" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "Milestone" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "SupportTicket" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "AnalyticsEvent" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "AuditLog" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "AdminUser" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "AdminUser" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "LoginAttempt" ALTER COLUMN "resetAt" TYPE TIMESTAMPTZ(3) USING "resetAt" AT TIME ZONE 'UTC';
ALTER TABLE "ContentEntry" ALTER COLUMN "draft" TYPE JSONB USING "draft"::jsonb;
ALTER TABLE "ContentEntry" ALTER COLUMN "published" TYPE JSONB USING "published"::jsonb;
ALTER TABLE "ContentEntry" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "ContentVersion" ALTER COLUMN "payload" TYPE JSONB USING "payload"::jsonb;
ALTER TABLE "ContentVersion" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "MediaAsset" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "CustomerNote" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "BookingNote" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "EmailLog" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "AdminSession" ALTER COLUMN "lastSeenAt" TYPE TIMESTAMPTZ(3) USING "lastSeenAt" AT TIME ZONE 'UTC';
ALTER TABLE "AdminSession" ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(3) USING "expiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "PaymentSettings" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "GatewayCredential" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "MediaAsset" ADD COLUMN "storageBucket" TEXT, ADD COLUMN "version" TEXT;
SET search_path TO vijaya, extensions, public;

-- A fixed venue-local calendar day, with a half-open UTC interval.
CREATE FUNCTION vijaya.slot_boundary(day text, minute integer) RETURNS timestamptz
  LANGUAGE sql IMMUTABLE STRICT SET search_path = pg_catalog
  RETURN (make_date(substr(day, 1, 4)::integer, substr(day, 6, 2)::integer, substr(day, 9, 2)::integer)
    + make_interval(mins => minute)) AT TIME ZONE 'Asia/Kolkata';

ALTER TABLE "SlotState" ADD CONSTRAINT "SlotState_no_overlap" EXCLUDE USING gist (
  "spaceId" WITH =,
  tstzrange(
    vijaya.slot_boundary("date", COALESCE("startMinute", CASE "slot" WHEN 'MORNING' THEN 420 WHEN 'AFTERNOON' THEN 780 WHEN 'EVENING' THEN 1080 ELSE 0 END)),
    vijaya.slot_boundary("date", COALESCE("endMinute", CASE "slot" WHEN 'MORNING' THEN 780 WHEN 'AFTERNOON' THEN 1080 WHEN 'EVENING' THEN 1380 ELSE 1440 END)),
    '[)'
  ) WITH &&
) WHERE ("status" <> 'CANCELLED');

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap" EXCLUDE USING gist (
  "spaceId" WITH =,
  tstzrange(
    COALESCE("startAt", vijaya.slot_boundary("eventDate", CASE "slot" WHEN 'MORNING' THEN 420 WHEN 'AFTERNOON' THEN 780 WHEN 'EVENING' THEN 1080 ELSE 0 END)),
    COALESCE("endAt", vijaya.slot_boundary("eventDate", CASE "slot" WHEN 'MORNING' THEN 780 WHEN 'AFTERNOON' THEN 1080 WHEN 'EVENING' THEN 1380 ELSE 1440 END)),
    '[)'
  ) WITH &&
) WHERE ("status" IN ('PENDING_HOLD', 'PENDING_APPROVAL', 'PENDING_PAYMENT', 'CONFIRMED'));

CREATE FUNCTION vijaya.expire_holds() RETURNS integer
  LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, vijaya
AS $$
DECLARE expired text[];
BEGIN
  PERFORM pg_advisory_xact_lock(20261123, 1);
  WITH released AS (
    UPDATE vijaya."Booking"
    SET status = 'EXPIRED', "holdExpiresAt" = NULL, "updatedAt" = now()
    WHERE status IN ('PENDING_HOLD','PENDING_PAYMENT') AND "holdExpiresAt" <= now()
    RETURNING reference
  )
  SELECT array_agg(reference) INTO expired FROM released;
  IF expired IS NULL THEN RETURN 0; END IF;

  DELETE FROM vijaya."SlotState" WHERE "bookingRef" = ANY(expired) AND source IN ('ONLINE','OPS');
  INSERT INTO vijaya."AuditLog" (id, action, entity, "entityRef", "createdAt")
    SELECT gen_random_uuid()::text, 'HOLD_EXPIRED', 'Booking', reference, now()
    FROM unnest(expired) AS reference;
  RETURN cardinality(expired);
END $$;

REVOKE ALL ON FUNCTION vijaya.expire_holds() FROM PUBLIC;

SET search_path TO vijaya;
