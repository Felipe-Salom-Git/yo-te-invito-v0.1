-- AlterTable
ALTER TABLE "CourtesyCreditLedgerEntry" ADD COLUMN "sourceCourtesyCampaignId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CourtesyCreditLedgerEntry_sourceCourtesyCampaignId_key" ON "CourtesyCreditLedgerEntry"("sourceCourtesyCampaignId");

-- CreateIndex
CREATE INDEX "CourtesyCreditLedgerEntry_sourceCourtesyCampaignId_idx" ON "CourtesyCreditLedgerEntry"("sourceCourtesyCampaignId");

-- AddForeignKey
ALTER TABLE "CourtesyCreditLedgerEntry" ADD CONSTRAINT "CourtesyCreditLedgerEntry_sourceCourtesyCampaignId_fkey" FOREIGN KEY ("sourceCourtesyCampaignId") REFERENCES "GastroCourtesyCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AuditAction
ALTER TYPE "AuditAction" ADD VALUE 'BENEFIT_CREDIT_DEBITED_FOR_COURTESY';
