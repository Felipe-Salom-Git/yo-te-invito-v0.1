-- V3.3 G12.2-A — promotional (no-ticketing) events owned by a gastro local.
-- Additive only: nullable Event.gastroProfileId + FK (RESTRICT) + index; CHECK = never producer AND gastro owner.
-- No UPDATE / DELETE of existing rows (all existing events keep gastroProfileId = NULL).

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "gastroProfileId" TEXT;

-- CreateIndex
CREATE INDEX "Event_tenantId_gastroProfileId_status_idx" ON "Event"("tenantId", "gastroProfileId", "status");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_gastroProfileId_fkey" FOREIGN KEY ("gastroProfileId") REFERENCES "GastroProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "Event" ADD CONSTRAINT "Event_single_owner_profile_check"
  CHECK ("producerProfileId" IS NULL OR "gastroProfileId" IS NULL);
