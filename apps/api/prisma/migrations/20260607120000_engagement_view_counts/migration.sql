-- Engagement view counters (V2: simple aggregate, no per-session dedup)
ALTER TABLE "Event" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProducerProfile" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
