-- V3.3 Etapa 7: ActivityCoupon domain (Actividades / Event.category = excursion).
-- Independent of GastroDiscount. Scanner parent EXCURSION_OPERATOR is already in schema.

CREATE TYPE "ActivityCouponType" AS ENUM ('PERCENT', 'FIXED');
CREATE TYPE "ActivityCouponStatus" AS ENUM (
  'PENDING_REVIEW',
  'APPROVED',
  'ACTIVE',
  'REJECTED',
  'CANCELLED',
  'EXPIRED'
);
CREATE TYPE "ActivityCouponOrigin" AS ENUM ('ADMIN', 'OPERATOR');
CREATE TYPE "ActivityCouponValidityMode" AS ENUM ('DATE_RANGE', 'WEEKLY_RECURRING');
CREATE TYPE "ActivityCouponClaimStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "ActivityCoupon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "excursionOperatorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "type" "ActivityCouponType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "validityMode" "ActivityCouponValidityMode" NOT NULL DEFAULT 'DATE_RANGE',
    "validWeekday" "GastroWeekday",
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "couponDate" TIMESTAMP(3),
    "imageUrls" JSONB,
    "status" "ActivityCouponStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejectionReason" TEXT,
    "pendingUpdate" JSONB,
    "pendingUpdateSubmittedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdByOrigin" "ActivityCouponOrigin" NOT NULL DEFAULT 'ADMIN',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityCoupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityCoupon_eventId_code_key" ON "ActivityCoupon"("eventId", "code");
CREATE INDEX "ActivityCoupon_tenantId_eventId_idx" ON "ActivityCoupon"("tenantId", "eventId");
CREATE INDEX "ActivityCoupon_tenantId_status_idx" ON "ActivityCoupon"("tenantId", "status");
CREATE INDEX "ActivityCoupon_excursionOperatorId_status_idx" ON "ActivityCoupon"("excursionOperatorId", "status");
CREATE INDEX "ActivityCoupon_archivedAt_idx" ON "ActivityCoupon"("archivedAt");
CREATE INDEX "ActivityCoupon_createdByOrigin_idx" ON "ActivityCoupon"("createdByOrigin");

ALTER TABLE "ActivityCoupon"
  ADD CONSTRAINT "ActivityCoupon_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActivityCoupon"
  ADD CONSTRAINT "ActivityCoupon_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityCoupon"
  ADD CONSTRAINT "ActivityCoupon_excursionOperatorId_fkey"
  FOREIGN KEY ("excursionOperatorId") REFERENCES "ExcursionOperator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActivityCoupon"
  ADD CONSTRAINT "ActivityCoupon_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ActivityCouponClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "status" "ActivityCouponClaimStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityCouponClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityCouponClaim_qrToken_key" ON "ActivityCouponClaim"("qrToken");
CREATE UNIQUE INDEX "ActivityCouponClaim_accessToken_key" ON "ActivityCouponClaim"("accessToken");
CREATE UNIQUE INDEX "ActivityCouponClaim_shortCode_key" ON "ActivityCouponClaim"("shortCode");
CREATE UNIQUE INDEX "ActivityCouponClaim_couponId_email_key" ON "ActivityCouponClaim"("couponId", "email");
CREATE INDEX "ActivityCouponClaim_tenantId_couponId_idx" ON "ActivityCouponClaim"("tenantId", "couponId");
CREATE INDEX "ActivityCouponClaim_userId_idx" ON "ActivityCouponClaim"("userId");
CREATE INDEX "ActivityCouponClaim_email_idx" ON "ActivityCouponClaim"("email");

ALTER TABLE "ActivityCouponClaim"
  ADD CONSTRAINT "ActivityCouponClaim_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActivityCouponClaim"
  ADD CONSTRAINT "ActivityCouponClaim_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "ActivityCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityCouponClaim"
  ADD CONSTRAINT "ActivityCouponClaim_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ActivityCouponValidation" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "claimId" TEXT,
    "scannerUserId" TEXT,
    "result" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityCouponValidation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityCouponValidation_claimId_key" ON "ActivityCouponValidation"("claimId");
CREATE INDEX "ActivityCouponValidation_couponId_idx" ON "ActivityCouponValidation"("couponId");
CREATE INDEX "ActivityCouponValidation_scannerUserId_idx" ON "ActivityCouponValidation"("scannerUserId");

ALTER TABLE "ActivityCouponValidation"
  ADD CONSTRAINT "ActivityCouponValidation_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "ActivityCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ActivityCouponValidation"
  ADD CONSTRAINT "ActivityCouponValidation_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "ActivityCouponClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ActivityCouponValidation"
  ADD CONSTRAINT "ActivityCouponValidation_scannerUserId_fkey"
  FOREIGN KEY ("scannerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACTIVITY_COUPON_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACTIVITY_COUPON_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACTIVITY_COUPON_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACTIVITY_COUPON_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACTIVITY_COUPON_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACTIVITY_COUPON_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACTIVITY_COUPON_UNARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACTIVITY_COUPON_REDEEMED';
