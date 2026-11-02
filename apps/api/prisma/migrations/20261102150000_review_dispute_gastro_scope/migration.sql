-- V3.3 G12.1-C — review disputes (denuncias) for gastro locals.
-- Additive only: producerProfileId becomes nullable (existing rows keep their value),
-- new nullable gastroProfileId + FK + index, CHECK = exactly one owner scope.
-- No UPDATE / DELETE of existing rows.

-- AlterTable
ALTER TABLE "ReviewDisputeRequest" ADD COLUMN     "gastroProfileId" TEXT,
ALTER COLUMN "producerProfileId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ReviewDisputeRequest_tenantId_gastroProfileId_idx" ON "ReviewDisputeRequest"("tenantId", "gastroProfileId");

-- AddForeignKey
ALTER TABLE "ReviewDisputeRequest" ADD CONSTRAINT "ReviewDisputeRequest_gastroProfileId_fkey" FOREIGN KEY ("gastroProfileId") REFERENCES "GastroProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "ReviewDisputeRequest" ADD CONSTRAINT "ReviewDisputeRequest_single_owner_scope_check"
  CHECK (("producerProfileId" IS NOT NULL) <> ("gastroProfileId" IS NOT NULL));
