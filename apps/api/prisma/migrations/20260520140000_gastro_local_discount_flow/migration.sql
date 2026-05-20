-- GastroProfile: local fields + public event link
ALTER TABLE "GastroProfile" ADD COLUMN "summary" TEXT;
ALTER TABLE "GastroProfile" ADD COLUMN "detail" TEXT;
ALTER TABLE "GastroProfile" ADD COLUMN "galleryUrls" JSONB;
ALTER TABLE "GastroProfile" ADD COLUMN "province" TEXT;
ALTER TABLE "GastroProfile" ADD COLUMN "geoLat" DOUBLE PRECISION;
ALTER TABLE "GastroProfile" ADD COLUMN "geoLng" DOUBLE PRECISION;
ALTER TABLE "GastroProfile" ADD COLUMN "openingHours" JSONB;
ALTER TABLE "GastroProfile" ADD COLUMN "openingHoursNote" TEXT;
ALTER TABLE "GastroProfile" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "GastroProfile" ADD COLUMN "menuUrl" TEXT;
ALTER TABLE "GastroProfile" ADD COLUMN "websiteUrl" TEXT;
ALTER TABLE "GastroProfile" ADD COLUMN "subcategoryId" TEXT;
ALTER TABLE "GastroProfile" ADD COLUMN "publicEventId" TEXT;

CREATE UNIQUE INDEX "GastroProfile_publicEventId_key" ON "GastroProfile"("publicEventId");

ALTER TABLE "GastroProfile" ADD CONSTRAINT "GastroProfile_subcategoryId_fkey"
  FOREIGN KEY ("subcategoryId") REFERENCES "ContentSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GastroProfile" ADD CONSTRAINT "GastroProfile_publicEventId_fkey"
  FOREIGN KEY ("publicEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- GastroDiscountStatus enum migration
CREATE TYPE "GastroDiscountStatus_new" AS ENUM (
  'PENDING_REVIEW',
  'COMMISSION_NEGOTIATION',
  'APPROVED',
  'ACTIVE',
  'REJECTED',
  'CANCELLED',
  'EXPIRED'
);

ALTER TABLE "GastroDiscount" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "GastroDiscount" ALTER COLUMN "status" TYPE "GastroDiscountStatus_new" USING (
  CASE "status"::text
    WHEN 'INACTIVE' THEN 'CANCELLED'::"GastroDiscountStatus_new"
    WHEN 'ACTIVE' THEN 'ACTIVE'::"GastroDiscountStatus_new"
    WHEN 'EXPIRED' THEN 'EXPIRED'::"GastroDiscountStatus_new"
    ELSE 'PENDING_REVIEW'::"GastroDiscountStatus_new"
  END
);

DROP TYPE "GastroDiscountStatus";
ALTER TYPE "GastroDiscountStatus_new" RENAME TO "GastroDiscountStatus";

ALTER TABLE "GastroDiscount" ALTER COLUMN "status" SET DEFAULT 'PENDING_REVIEW';

-- GastroDiscount: workflow + content fields
ALTER TABLE "GastroDiscount" ADD COLUMN "discountDate" TIMESTAMP(3);
ALTER TABLE "GastroDiscount" ADD COLUMN "summary" TEXT;
ALTER TABLE "GastroDiscount" ADD COLUMN "detail" TEXT;
ALTER TABLE "GastroDiscount" ADD COLUMN "qrToken" TEXT;
ALTER TABLE "GastroDiscount" ADD COLUMN "qrGeneratedAt" TIMESTAMP(3);
ALTER TABLE "GastroDiscount" ADD COLUMN "emailSentAt" TIMESTAMP(3);
ALTER TABLE "GastroDiscount" ADD COLUMN "emailSendError" TEXT;
ALTER TABLE "GastroDiscount" ADD COLUMN "lastEmailAttemptAt" TIMESTAMP(3);
ALTER TABLE "GastroDiscount" ADD COLUMN "adminNotes" TEXT;
ALTER TABLE "GastroDiscount" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "GastroDiscount" ADD COLUMN "commissionCoordinationAcceptedAt" TIMESTAMP(3);

CREATE INDEX "GastroDiscount_tenantId_status_idx" ON "GastroDiscount"("tenantId", "status");
CREATE INDEX "GastroDiscount_gastroProfileId_status_idx" ON "GastroDiscount"("gastroProfileId", "status");

-- AuditAction extensions
ALTER TYPE "AuditAction" ADD VALUE 'GASTRO_DISCOUNT_COMMISSION_NEGOTIATION';
ALTER TYPE "AuditAction" ADD VALUE 'GASTRO_DISCOUNT_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'GASTRO_DISCOUNT_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'GASTRO_DISCOUNT_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'GASTRO_DISCOUNT_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'GASTRO_DISCOUNT_QR_EMAIL_SENT';
