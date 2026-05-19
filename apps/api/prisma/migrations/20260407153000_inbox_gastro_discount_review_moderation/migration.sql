-- CreateEnum
CREATE TYPE "InboxItemKind" AS ENUM ('GASTRO_PROMOTION_REQUEST', 'REVIEW_MODERATION_REQUEST');

-- CreateEnum
CREATE TYPE "InboxItemStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GastroDiscountType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "GastroDiscountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "hiddenFromPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Review" ADD COLUMN "officialReply" TEXT;
ALTER TABLE "Review" ADD COLUMN "moderatedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "moderatedByUserId" TEXT;

-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "InboxItemKind" NOT NULL,
    "status" "InboxItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT NOT NULL,
    "assigneeRole" "Role" NOT NULL DEFAULT 'ADMIN',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolutionNote" TEXT,

    CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastroDiscount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "gastroProfileId" TEXT,
    "code" TEXT NOT NULL,
    "type" "GastroDiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "status" "GastroDiscountStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceInboxItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GastroDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastroDiscountValidation" (
    "id" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "orderId" TEXT,

    CONSTRAINT "GastroDiscountValidation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GastroDiscount_sourceInboxItemId_key" ON "GastroDiscount"("sourceInboxItemId");

-- CreateIndex
CREATE UNIQUE INDEX "GastroDiscount_eventId_code_key" ON "GastroDiscount"("eventId", "code");

-- CreateIndex
CREATE INDEX "GastroDiscount_tenantId_eventId_idx" ON "GastroDiscount"("tenantId", "eventId");

-- CreateIndex
CREATE INDEX "GastroDiscountValidation_discountId_idx" ON "GastroDiscountValidation"("discountId");

-- CreateIndex
CREATE INDEX "InboxItem_tenantId_status_kind_idx" ON "InboxItem"("tenantId", "status", "kind");

-- CreateIndex
CREATE INDEX "InboxItem_tenantId_status_idx" ON "InboxItem"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InboxItem_createdByUserId_idx" ON "InboxItem"("createdByUserId");

-- CreateIndex
CREATE INDEX "Review_moderatedByUserId_idx" ON "Review"("moderatedByUserId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_moderatedByUserId_fkey" FOREIGN KEY ("moderatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastroDiscount" ADD CONSTRAINT "GastroDiscount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastroDiscount" ADD CONSTRAINT "GastroDiscount_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastroDiscount" ADD CONSTRAINT "GastroDiscount_gastroProfileId_fkey" FOREIGN KEY ("gastroProfileId") REFERENCES "GastroProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastroDiscountValidation" ADD CONSTRAINT "GastroDiscountValidation_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "GastroDiscount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
