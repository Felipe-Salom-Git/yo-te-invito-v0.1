-- Structured weekly opening hours + legacy note field

ALTER TABLE "RentalLocation" ADD COLUMN "openingHoursNote" TEXT;

UPDATE "RentalLocation"
SET "openingHoursNote" = "openingHours"
WHERE "openingHours" IS NOT NULL AND TRIM("openingHours") <> '';

ALTER TABLE "RentalLocation" ADD COLUMN "openingHoursNew" JSONB;

ALTER TABLE "RentalLocation" DROP COLUMN "openingHours";

ALTER TABLE "RentalLocation" RENAME COLUMN "openingHoursNew" TO "openingHours";
