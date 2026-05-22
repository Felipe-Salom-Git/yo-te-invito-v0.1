-- CreateEnum
CREATE TYPE "ReferralCommissionType" AS ENUM ('PERCENTAGE', 'FIXED_PER_TICKET');

-- CreateEnum
CREATE TYPE "ReferralCommercialProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReferralCommercialAgreementStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ReferralCommercialProposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "producerProfileId" TEXT NOT NULL,
    "referrerProfileId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "commissionType" "ReferralCommissionType" NOT NULL,
    "commissionValue" DECIMAL(12,4) NOT NULL,
    "message" TEXT,
    "terms" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "status" "ReferralCommercialProposalStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCommercialProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCommercialAgreement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "producerProfileId" TEXT NOT NULL,
    "referrerProfileId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "referralLinkId" TEXT NOT NULL,
    "commissionType" "ReferralCommissionType" NOT NULL,
    "commissionValue" DECIMAL(12,4) NOT NULL,
    "status" "ReferralCommercialAgreementStatus" NOT NULL DEFAULT 'ACTIVE',
    "acceptedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCommercialAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCommercialAgreement_proposalId_key" ON "ReferralCommercialAgreement"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCommercialAgreement_referralLinkId_key" ON "ReferralCommercialAgreement"("referralLinkId");

-- CreateIndex
CREATE INDEX "ReferralCommercialProposal_tenantId_idx" ON "ReferralCommercialProposal"("tenantId");

-- CreateIndex
CREATE INDEX "ReferralCommercialProposal_producerProfileId_idx" ON "ReferralCommercialProposal"("producerProfileId");

-- CreateIndex
CREATE INDEX "ReferralCommercialProposal_referrerProfileId_idx" ON "ReferralCommercialProposal"("referrerProfileId");

-- CreateIndex
CREATE INDEX "ReferralCommercialProposal_eventId_idx" ON "ReferralCommercialProposal"("eventId");

-- CreateIndex
CREATE INDEX "ReferralCommercialProposal_tenantId_producerProfileId_status_idx" ON "ReferralCommercialProposal"("tenantId", "producerProfileId", "status");

-- CreateIndex
CREATE INDEX "ReferralCommercialProposal_tenantId_referrerProfileId_status_idx" ON "ReferralCommercialProposal"("tenantId", "referrerProfileId", "status");

-- CreateIndex
CREATE INDEX "ReferralCommercialProposal_tenantId_producerProfileId_referrer_idx" ON "ReferralCommercialProposal"("tenantId", "producerProfileId", "referrerProfileId", "eventId");

-- CreateIndex
CREATE INDEX "ReferralCommercialAgreement_tenantId_idx" ON "ReferralCommercialAgreement"("tenantId");

-- CreateIndex
CREATE INDEX "ReferralCommercialAgreement_producerProfileId_idx" ON "ReferralCommercialAgreement"("producerProfileId");

-- CreateIndex
CREATE INDEX "ReferralCommercialAgreement_referrerProfileId_idx" ON "ReferralCommercialAgreement"("referrerProfileId");

-- CreateIndex
CREATE INDEX "ReferralCommercialAgreement_eventId_idx" ON "ReferralCommercialAgreement"("eventId");

-- AddForeignKey
ALTER TABLE "ReferralCommercialProposal" ADD CONSTRAINT "ReferralCommercialProposal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommercialProposal" ADD CONSTRAINT "ReferralCommercialProposal_producerProfileId_fkey" FOREIGN KEY ("producerProfileId") REFERENCES "ProducerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommercialProposal" ADD CONSTRAINT "ReferralCommercialProposal_referrerProfileId_fkey" FOREIGN KEY ("referrerProfileId") REFERENCES "ReferrerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommercialProposal" ADD CONSTRAINT "ReferralCommercialProposal_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommercialAgreement" ADD CONSTRAINT "ReferralCommercialAgreement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommercialAgreement" ADD CONSTRAINT "ReferralCommercialAgreement_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ReferralCommercialProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommercialAgreement" ADD CONSTRAINT "ReferralCommercialAgreement_producerProfileId_fkey" FOREIGN KEY ("producerProfileId") REFERENCES "ProducerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommercialAgreement" ADD CONSTRAINT "ReferralCommercialAgreement_referrerProfileId_fkey" FOREIGN KEY ("referrerProfileId") REFERENCES "ReferrerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommercialAgreement" ADD CONSTRAINT "ReferralCommercialAgreement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCommercialAgreement" ADD CONSTRAINT "ReferralCommercialAgreement_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
