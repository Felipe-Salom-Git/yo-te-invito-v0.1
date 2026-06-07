-- V3.1 Slice 8: multiple subcategories per event (phase 1 — excursions)
CREATE TABLE "EventSubcategory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventSubcategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventSubcategory_eventId_subcategoryId_key" ON "EventSubcategory"("eventId", "subcategoryId");
CREATE INDEX "EventSubcategory_eventId_idx" ON "EventSubcategory"("eventId");
CREATE INDEX "EventSubcategory_subcategoryId_idx" ON "EventSubcategory"("subcategoryId");

ALTER TABLE "EventSubcategory" ADD CONSTRAINT "EventSubcategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventSubcategory" ADD CONSTRAINT "EventSubcategory_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "ContentSubcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: legacy Event.subcategoryId → junction row (idempotent)
INSERT INTO "EventSubcategory" ("id", "eventId", "subcategoryId", "isPrimary", "createdAt")
SELECT
    'backfill_' || e."id" || '_' || e."subcategoryId",
    e."id",
    e."subcategoryId",
    true,
    CURRENT_TIMESTAMP
FROM "Event" e
WHERE e."subcategoryId" IS NOT NULL
ON CONFLICT ("eventId", "subcategoryId") DO NOTHING;
