-- AlterTable
ALTER TABLE "SlotState" ADD COLUMN "endMinute" INTEGER;
ALTER TABLE "SlotState" ADD COLUMN "groupId" TEXT;
ALTER TABLE "SlotState" ADD COLUMN "startMinute" INTEGER;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "paidAt" DATETIME;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "followUpAt" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "internalNotes" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "actorId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "afterJson" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "beforeJson" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "ip" TEXT;

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "resetAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContentEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "draft" TEXT NOT NULL,
    "published" TEXT,
    "editedBy" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContentVersion_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ContentEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "alt" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "BookingNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingRef" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingRef" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SessionConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "spaceId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Space" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Space" ("active", "availabilityEnabled", "bookableOnline", "capacityMax", "capacityMin", "category", "createdAt", "crmVenueId", "id", "name", "requiresApproval", "setting", "updatedAt") SELECT "active", "availabilityEnabled", "bookableOnline", "capacityMax", "capacityMin", "category", "createdAt", "crmVenueId", "id", "name", "requiresApproval", "setting", "updatedAt" FROM "Space";
DROP TABLE "Space";
ALTER TABLE "new_Space" RENAME TO "Space";
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "startAt" DATETIME,
    "endAt" DATETIME,
    "customerCountry" TEXT NOT NULL DEFAULT 'India',
    "notes" TEXT,
    "baseAmount" INTEGER NOT NULL,
    "weekendUplift" INTEGER NOT NULL DEFAULT 0,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "depositAmount" INTEGER NOT NULL DEFAULT 0,
    "totalPayable" INTEGER NOT NULL,
    "addons" TEXT,
    "holdExpiresAt" DATETIME,
    "confirmedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("addons", "baseAmount", "cancelledAt", "childSpaceIds", "confirmedAt", "createdAt", "crmSync", "customerCountry", "customerEmail", "customerName", "customerPhone", "depositAmount", "eventDate", "eventType", "guests", "holdExpiresAt", "id", "notes", "reference", "slot", "spaceId", "spaceName", "status", "taxAmount", "totalPayable", "updatedAt", "weekendUplift") SELECT "addons", "baseAmount", "cancelledAt", "childSpaceIds", "confirmedAt", "createdAt", "crmSync", "customerCountry", "customerEmail", "customerName", "customerPhone", "depositAmount", "eventDate", "eventType", "guests", "holdExpiresAt", "id", "notes", "reference", "slot", "spaceId", "spaceName", "status", "taxAmount", "totalPayable", "updatedAt", "weekendUplift" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_reference_key" ON "Booking"("reference");
CREATE UNIQUE INDEX "Booking_requestKey_key" ON "Booking"("requestKey");
CREATE INDEX "Booking_customerEmail_idx" ON "Booking"("customerEmail");
CREATE INDEX "Booking_eventDate_idx" ON "Booking"("eventDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

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
CREATE INDEX "SlotState_bookingRef_idx" ON "SlotState"("bookingRef");


-- Compare half-open local time ranges on each physical venue.
CREATE TRIGGER "SlotState_no_overlap_insert"
BEFORE INSERT ON "SlotState"
WHEN NEW.status <> 'CANCELLED'
BEGIN
  SELECT RAISE(ABORT, 'INVALID_SLOT_INTERVAL')
  WHERE COALESCE(NEW.startMinute, CASE NEW.slot WHEN 'MORNING' THEN 420 WHEN 'AFTERNOON' THEN 780 WHEN 'EVENING' THEN 1080 ELSE 0 END) < 0 OR COALESCE(NEW.endMinute, CASE NEW.slot WHEN 'MORNING' THEN 780 WHEN 'AFTERNOON' THEN 1080 WHEN 'EVENING' THEN 1380 ELSE 1440 END) > 1440
     OR COALESCE(NEW.startMinute, CASE NEW.slot WHEN 'MORNING' THEN 420 WHEN 'AFTERNOON' THEN 780 WHEN 'EVENING' THEN 1080 ELSE 0 END) >= COALESCE(NEW.endMinute, CASE NEW.slot WHEN 'MORNING' THEN 780 WHEN 'AFTERNOON' THEN 1080 WHEN 'EVENING' THEN 1380 ELSE 1440 END);

  SELECT RAISE(ABORT, 'SLOT_UNAVAILABLE')
  WHERE EXISTS (
    SELECT 1 FROM "SlotState" existing
    WHERE existing.spaceId = NEW.spaceId AND existing.date = NEW.date
      AND existing.status <> 'CANCELLED'
      AND COALESCE(existing.startMinute, CASE existing.slot WHEN 'MORNING' THEN 420 WHEN 'AFTERNOON' THEN 780 WHEN 'EVENING' THEN 1080 ELSE 0 END) < COALESCE(NEW.endMinute, CASE NEW.slot WHEN 'MORNING' THEN 780 WHEN 'AFTERNOON' THEN 1080 WHEN 'EVENING' THEN 1380 ELSE 1440 END)
      AND COALESCE(NEW.startMinute, CASE NEW.slot WHEN 'MORNING' THEN 420 WHEN 'AFTERNOON' THEN 780 WHEN 'EVENING' THEN 1080 ELSE 0 END) < COALESCE(existing.endMinute, CASE existing.slot WHEN 'MORNING' THEN 780 WHEN 'AFTERNOON' THEN 1080 WHEN 'EVENING' THEN 1380 ELSE 1440 END)
  );
END;

-- Compare half-open local time ranges on each physical venue.
CREATE TRIGGER "SlotState_no_overlap_update"
BEFORE UPDATE ON "SlotState"
WHEN NEW.status <> 'CANCELLED'
BEGIN
  SELECT RAISE(ABORT, 'INVALID_SLOT_INTERVAL')
  WHERE COALESCE(NEW.startMinute, CASE NEW.slot WHEN 'MORNING' THEN 420 WHEN 'AFTERNOON' THEN 780 WHEN 'EVENING' THEN 1080 ELSE 0 END) < 0 OR COALESCE(NEW.endMinute, CASE NEW.slot WHEN 'MORNING' THEN 780 WHEN 'AFTERNOON' THEN 1080 WHEN 'EVENING' THEN 1380 ELSE 1440 END) > 1440
     OR COALESCE(NEW.startMinute, CASE NEW.slot WHEN 'MORNING' THEN 420 WHEN 'AFTERNOON' THEN 780 WHEN 'EVENING' THEN 1080 ELSE 0 END) >= COALESCE(NEW.endMinute, CASE NEW.slot WHEN 'MORNING' THEN 780 WHEN 'AFTERNOON' THEN 1080 WHEN 'EVENING' THEN 1380 ELSE 1440 END);

  SELECT RAISE(ABORT, 'SLOT_UNAVAILABLE')
  WHERE EXISTS (
    SELECT 1 FROM "SlotState" existing
    WHERE existing.spaceId = NEW.spaceId AND existing.date = NEW.date
      AND existing.status <> 'CANCELLED' AND existing.id <> OLD.id
      AND COALESCE(existing.startMinute, CASE existing.slot WHEN 'MORNING' THEN 420 WHEN 'AFTERNOON' THEN 780 WHEN 'EVENING' THEN 1080 ELSE 0 END) < COALESCE(NEW.endMinute, CASE NEW.slot WHEN 'MORNING' THEN 780 WHEN 'AFTERNOON' THEN 1080 WHEN 'EVENING' THEN 1380 ELSE 1440 END)
      AND COALESCE(NEW.startMinute, CASE NEW.slot WHEN 'MORNING' THEN 420 WHEN 'AFTERNOON' THEN 780 WHEN 'EVENING' THEN 1080 ELSE 0 END) < COALESCE(existing.endMinute, CASE existing.slot WHEN 'MORNING' THEN 780 WHEN 'AFTERNOON' THEN 1080 WHEN 'EVENING' THEN 1380 ELSE 1440 END)
  );
END;

CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "lastSeenAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL
);
CREATE INDEX "AdminSession_adminId_idx" ON "AdminSession"("adminId");
