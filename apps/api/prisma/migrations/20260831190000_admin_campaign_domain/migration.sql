-- V3.3 Etapa 8.2: Admin campaign domain (EMAIL/WHATSAPP channels; deliveries independent of NotificationDeliveryLog).

CREATE TYPE "AdminCampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');
CREATE TYPE "AdminCampaignChannel" AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE "AdminCampaignContentType" AS ENUM ('GASTRO_DISCOUNT', 'ACTIVITY_COUPON', 'EVENT', 'EXCURSION');
CREATE TYPE "AdminCampaignAudienceKind" AS ENUM ('ALL_ELIGIBLE', 'CITY', 'FAVORITE_CATEGORY', 'CONTENT_CLAIMANTS');
CREATE TYPE "AdminCampaignDeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'SKIPPED', 'FAILED');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_SEND_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CAMPAIGN_ARCHIVED';

CREATE TABLE "AdminCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "status" "AdminCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "channel" "AdminCampaignChannel" NOT NULL,
    "contentType" "AdminCampaignContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "contentSnapshot" JSONB,
    "audienceKind" "AdminCampaignAudienceKind" NOT NULL,
    "audienceFilter" JSONB,
    "subject" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL,
    "ctaUrl" TEXT,
    "queuedCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelRequestedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminCampaign_tenantId_status_idx" ON "AdminCampaign"("tenantId", "status");
CREATE INDEX "AdminCampaign_tenantId_createdAt_idx" ON "AdminCampaign"("tenantId", "createdAt");

ALTER TABLE "AdminCampaign"
  ADD CONSTRAINT "AdminCampaign_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminCampaign"
  ADD CONSTRAINT "AdminCampaign_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AdminCampaignDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT,
    "channel" "AdminCampaignChannel" NOT NULL,
    "status" "AdminCampaignDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "skipReason" TEXT,
    "errorCode" TEXT,
    "providerMessageId" TEXT,
    "targetHint" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "AdminCampaignDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminCampaignDelivery_campaignId_userId_channel_key" ON "AdminCampaignDelivery"("campaignId", "userId", "channel");
CREATE INDEX "AdminCampaignDelivery_tenantId_campaignId_status_idx" ON "AdminCampaignDelivery"("tenantId", "campaignId", "status");
CREATE INDEX "AdminCampaignDelivery_campaignId_status_idx" ON "AdminCampaignDelivery"("campaignId", "status");

ALTER TABLE "AdminCampaignDelivery"
  ADD CONSTRAINT "AdminCampaignDelivery_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AdminCampaignDelivery"
  ADD CONSTRAINT "AdminCampaignDelivery_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "AdminCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AdminCampaignDelivery"
  ADD CONSTRAINT "AdminCampaignDelivery_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
