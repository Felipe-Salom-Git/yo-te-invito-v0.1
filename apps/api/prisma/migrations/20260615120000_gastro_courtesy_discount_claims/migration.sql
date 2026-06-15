-- Gastro courtesy campaigns + extended discount claims

CREATE TYPE "GastroDiscountVisibility" AS ENUM ('PUBLIC', 'COURTESY_ONLY');
CREATE TYPE "GastroDiscountClaimType" AS ENUM ('PUBLIC_REQUEST', 'COURTESY');
CREATE TYPE "GastroDiscountClaimSource" AS ENUM ('WEB', 'MANUAL_EMAIL', 'FOLLOWERS');
CREATE TYPE "GastroDiscountClaimStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELLED');

ALTER TYPE "AuditAction" ADD VALUE 'GASTRO_DISCOUNT_COURTESY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'GASTRO_DISCOUNT_COURTESY_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'GASTRO_DISCOUNT_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'GASTRO_DISCOUNT_REDEEMED';

ALTER TABLE "GastroDiscount" ADD COLUMN "visibility" "GastroDiscountVisibility" NOT NULL DEFAULT 'PUBLIC';

CREATE TABLE "GastroCourtesyCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gastroProfileId" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discountLabel" TEXT,
    "message" TEXT,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GastroCourtesyCampaign_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GastroCourtesyCampaign_discountId_key" ON "GastroCourtesyCampaign"("discountId");
CREATE INDEX "GastroCourtesyCampaign_tenantId_gastroProfileId_idx" ON "GastroCourtesyCampaign"("tenantId", "gastroProfileId");
CREATE INDEX "GastroCourtesyCampaign_createdByUserId_idx" ON "GastroCourtesyCampaign"("createdByUserId");

ALTER TABLE "GastroCourtesyCampaign" ADD CONSTRAINT "GastroCourtesyCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GastroCourtesyCampaign" ADD CONSTRAINT "GastroCourtesyCampaign_gastroProfileId_fkey" FOREIGN KEY ("gastroProfileId") REFERENCES "GastroProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GastroCourtesyCampaign" ADD CONSTRAINT "GastroCourtesyCampaign_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "GastroDiscount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GastroCourtesyCampaign" ADD CONSTRAINT "GastroCourtesyCampaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GastroDiscountClaim" ADD COLUMN "type" "GastroDiscountClaimType" NOT NULL DEFAULT 'PUBLIC_REQUEST';
ALTER TABLE "GastroDiscountClaim" ADD COLUMN "source" "GastroDiscountClaimSource" NOT NULL DEFAULT 'WEB';
ALTER TABLE "GastroDiscountClaim" ADD COLUMN "status" "GastroDiscountClaimStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "GastroDiscountClaim" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "GastroDiscountClaim" ADD COLUMN "usedAt" TIMESTAMP(3);
ALTER TABLE "GastroDiscountClaim" ADD COLUMN "recipientName" TEXT;
ALTER TABLE "GastroDiscountClaim" ADD COLUMN "courtesyCampaignId" TEXT;

CREATE UNIQUE INDEX "GastroDiscountClaim_courtesyCampaignId_email_key" ON "GastroDiscountClaim"("courtesyCampaignId", "email");
CREATE INDEX "GastroDiscountClaim_email_idx" ON "GastroDiscountClaim"("email");
CREATE INDEX "GastroDiscountClaim_courtesyCampaignId_idx" ON "GastroDiscountClaim"("courtesyCampaignId");
CREATE INDEX "GastroDiscount_gastroProfileId_visibility_status_idx" ON "GastroDiscount"("gastroProfileId", "visibility", "status");

ALTER TABLE "GastroDiscountClaim" ADD CONSTRAINT "GastroDiscountClaim_courtesyCampaignId_fkey" FOREIGN KEY ("courtesyCampaignId") REFERENCES "GastroCourtesyCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
