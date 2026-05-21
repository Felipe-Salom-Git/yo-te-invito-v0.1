-- CreateEnum
CREATE TYPE "ReviewPublicStatus" AS ENUM ('VISIBLE', 'IN_REVIEW', 'HIDDEN', 'REPORT_REJECTED', 'DELETED_BY_USER');

-- CreateEnum
CREATE TYPE "ReviewReplyAuthorType" AS ENUM ('PRODUCER', 'GASTRO_OWNER', 'HOTEL_OWNER', 'PLATFORM_ADMIN');

-- AlterTable Review
ALTER TABLE "Review" ADD COLUMN "overallRating" INTEGER,
ADD COLUMN "aspectRatings" JSONB,
ADD COLUMN "status" "ReviewPublicStatus" NOT NULL DEFAULT 'VISIBLE',
ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "hiddenReason" TEXT,
ADD COLUMN "hiddenAt" TIMESTAMP(3),
ADD COLUMN "hiddenByUserId" TEXT,
ADD COLUMN "replyAuthorType" "ReviewReplyAuthorType",
ADD COLUMN "replyAuthorId" TEXT,
ADD COLUMN "replyCreatedAt" TIMESTAMP(3),
ADD COLUMN "replyUpdatedAt" TIMESTAMP(3);

-- Backfill V2 fields from legacy data
UPDATE "Review"
SET
  "overallRating" = LEAST(10, GREATEST(1, "score" * 2)),
  "status" = CASE WHEN "hiddenFromPublic" = true THEN 'HIDDEN'::"ReviewPublicStatus" ELSE 'VISIBLE'::"ReviewPublicStatus" END
WHERE "overallRating" IS NULL;

-- AlterTable CommercialRelationshipReview
ALTER TABLE "CommercialRelationshipReview" ADD COLUMN "overallRating" INTEGER,
ADD COLUMN "aspectRatings" JSONB;

UPDATE "CommercialRelationshipReview"
SET "overallRating" = LEAST(10, GREATEST(1, "rating" * 2))
WHERE "overallRating" IS NULL;

-- CreateIndex
CREATE INDEX "Review_eventId_status_idx" ON "Review"("eventId", "status");

CREATE INDEX "Review_userId_status_idx" ON "Review"("userId", "status");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_hiddenByUserId_fkey" FOREIGN KEY ("hiddenByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AuditAction extensions
ALTER TYPE "AuditAction" ADD VALUE 'REVIEW_HIDDEN';
ALTER TYPE "AuditAction" ADD VALUE 'REVIEW_RESTORED';
ALTER TYPE "AuditAction" ADD VALUE 'REVIEW_REPLY_UPDATED';
