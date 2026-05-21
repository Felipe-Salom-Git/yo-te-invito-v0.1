-- AlterTable
ALTER TABLE "Event" ADD COLUMN "bayesianRating" DOUBLE PRECISION,
ADD COLUMN "rankingScore" DOUBLE PRECISION;

-- Backfill from existing public ratings (approximate until next review recompute)
UPDATE "Event"
SET
  "bayesianRating" = COALESCE("ratingAvg", 8.0),
  "rankingScore" = COALESCE("ratingAvg", 8.0)
WHERE "ratingCount" > 0;

CREATE INDEX "Event_tenantId_category_rankingScore_idx" ON "Event"("tenantId", "category", "rankingScore");
