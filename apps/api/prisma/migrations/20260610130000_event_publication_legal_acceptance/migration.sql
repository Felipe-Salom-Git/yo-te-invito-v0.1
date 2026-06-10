-- AlterEnum
ALTER TYPE "LegalAcceptanceContext" ADD VALUE 'EVENT_PUBLICATION';

-- AlterTable
ALTER TABLE "UserLegalAcceptance" ADD COLUMN "eventId" TEXT NOT NULL DEFAULT '';

-- DropIndex
DROP INDEX "UserLegalAcceptance_userId_documentVersionId_context_key";

-- CreateIndex
CREATE UNIQUE INDEX "UserLegalAcceptance_userId_documentVersionId_context_eventId_key" ON "UserLegalAcceptance"("userId", "documentVersionId", "context", "eventId");

-- CreateIndex
CREATE INDEX "UserLegalAcceptance_userId_context_eventId_idx" ON "UserLegalAcceptance"("userId", "context", "eventId");
