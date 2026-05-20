-- CreateEnum
CREATE TYPE "CommercialReviewTarget" AS ENUM ('PRODUCER', 'REFERRER');

-- CreateEnum
CREATE TYPE "CommercialReviewerRole" AS ENUM ('PRODUCER', 'REFERRER');

-- CreateTable
CREATE TABLE "CommercialRelationshipReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "relationshipId" TEXT NOT NULL,
    "producerProfileId" TEXT NOT NULL,
    "referrerProfileId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "reviewerRole" "CommercialReviewerRole" NOT NULL,
    "targetType" "CommercialReviewTarget" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialRelationshipReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommercialRelationshipReview_relationshipId_reviewerUserId_targetType_key" ON "CommercialRelationshipReview"("relationshipId", "reviewerUserId", "targetType");

-- CreateIndex
CREATE INDEX "CommercialRelationshipReview_tenantId_producerProfileId_idx" ON "CommercialRelationshipReview"("tenantId", "producerProfileId");

-- CreateIndex
CREATE INDEX "CommercialRelationshipReview_tenantId_referrerProfileId_idx" ON "CommercialRelationshipReview"("tenantId", "referrerProfileId");

-- CreateIndex
CREATE INDEX "CommercialRelationshipReview_reviewerUserId_idx" ON "CommercialRelationshipReview"("reviewerUserId");

-- AddForeignKey
ALTER TABLE "CommercialRelationshipReview" ADD CONSTRAINT "CommercialRelationshipReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialRelationshipReview" ADD CONSTRAINT "CommercialRelationshipReview_relationshipId_fkey" FOREIGN KEY ("relationshipId") REFERENCES "ProducerReferrerRelationship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialRelationshipReview" ADD CONSTRAINT "CommercialRelationshipReview_producerProfileId_fkey" FOREIGN KEY ("producerProfileId") REFERENCES "ProducerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialRelationshipReview" ADD CONSTRAINT "CommercialRelationshipReview_referrerProfileId_fkey" FOREIGN KEY ("referrerProfileId") REFERENCES "ReferrerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialRelationshipReview" ADD CONSTRAINT "CommercialRelationshipReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
