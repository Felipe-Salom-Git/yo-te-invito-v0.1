-- AlterEnum
ALTER TYPE "ReferralCommissionStatus" ADD VALUE 'CONFIRMED';
ALTER TYPE "ReferralCommissionStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "ReferralCommissionStatus" ADD VALUE 'MARKED_AS_PAID';

-- AlterTable
ALTER TABLE "ReferralCommission" ADD COLUMN "referralAttributionId" TEXT,
ADD COLUMN "agreementId" TEXT,
ADD COLUMN "producerProfileId" TEXT,
ADD COLUMN "referrerProfileId" TEXT,
ADD COLUMN "orderId" TEXT,
ADD COLUMN "commissionType" "ReferralCommissionType",
ADD COLUMN "commissionValue" DECIMAL(12,4),
ADD COLUMN "attributedSubtotalCents" INTEGER,
ADD COLUMN "ticketQuantity" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCommission_referralAttributionId_key" ON "ReferralCommission"("referralAttributionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCommission_orderId_key" ON "ReferralCommission"("orderId");

-- CreateIndex
CREATE INDEX "ReferralCommission_agreementId_idx" ON "ReferralCommission"("agreementId");

-- CreateIndex
CREATE INDEX "ReferralCommission_referrerProfileId_idx" ON "ReferralCommission"("referrerProfileId");

-- CreateIndex
CREATE INDEX "ReferralCommission_producerProfileId_idx" ON "ReferralCommission"("producerProfileId");

-- AddForeignKey
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_referralAttributionId_fkey" FOREIGN KEY ("referralAttributionId") REFERENCES "ReferralAttribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommission" ADD CONSTRAINT "ReferralCommission_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "ReferralCommercialAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
