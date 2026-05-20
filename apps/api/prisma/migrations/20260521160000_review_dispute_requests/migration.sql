-- CreateEnum
CREATE TYPE "ReviewDisputeReasonType" AS ENUM ('UNFAIR_RATING', 'OFFENSIVE', 'FALSE_INFORMATION', 'WRONG_EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewDisputeStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'ACCEPTED', 'REJECTED', 'RESOLVED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "InboxItemKind" ADD VALUE 'REVIEW_DISPUTE_REQUEST';

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'REVIEW_DISPUTE_IN_REVIEW';
ALTER TYPE "AuditAction" ADD VALUE 'REVIEW_DISPUTE_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'REVIEW_DISPUTE_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'REVIEW_DISPUTE_RESOLVED';

-- CreateTable
CREATE TABLE "ReviewDisputeRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "producerProfileId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "reasonType" "ReviewDisputeReasonType" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ReviewDisputeStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "inboxItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewDisputeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewDisputeRequest_inboxItemId_key" ON "ReviewDisputeRequest"("inboxItemId");

-- CreateIndex
CREATE INDEX "ReviewDisputeRequest_tenantId_producerProfileId_idx" ON "ReviewDisputeRequest"("tenantId", "producerProfileId");

-- CreateIndex
CREATE INDEX "ReviewDisputeRequest_tenantId_reviewId_idx" ON "ReviewDisputeRequest"("tenantId", "reviewId");

-- CreateIndex
CREATE INDEX "ReviewDisputeRequest_tenantId_status_idx" ON "ReviewDisputeRequest"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "ReviewDisputeRequest" ADD CONSTRAINT "ReviewDisputeRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDisputeRequest" ADD CONSTRAINT "ReviewDisputeRequest_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDisputeRequest" ADD CONSTRAINT "ReviewDisputeRequest_producerProfileId_fkey" FOREIGN KEY ("producerProfileId") REFERENCES "ProducerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDisputeRequest" ADD CONSTRAINT "ReviewDisputeRequest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDisputeRequest" ADD CONSTRAINT "ReviewDisputeRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDisputeRequest" ADD CONSTRAINT "ReviewDisputeRequest_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDisputeRequest" ADD CONSTRAINT "ReviewDisputeRequest_inboxItemId_fkey" FOREIGN KEY ("inboxItemId") REFERENCES "InboxItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
