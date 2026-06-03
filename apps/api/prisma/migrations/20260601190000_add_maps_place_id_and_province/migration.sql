-- AlterTable: optional Google Places id and province for location entities (Maps 5)
ALTER TABLE "Event" ADD COLUMN "province" TEXT,
ADD COLUMN "googlePlaceId" TEXT;

ALTER TABLE "GastroProfile" ADD COLUMN "googlePlaceId" TEXT;

ALTER TABLE "HotelProfile" ADD COLUMN "province" TEXT,
ADD COLUMN "googlePlaceId" TEXT;

ALTER TABLE "RentalLocation" ADD COLUMN "city" TEXT,
ADD COLUMN "province" TEXT,
ADD COLUMN "googlePlaceId" TEXT;

ALTER TABLE "ExcursionOperator" ADD COLUMN "province" TEXT,
ADD COLUMN "googlePlaceId" TEXT;
