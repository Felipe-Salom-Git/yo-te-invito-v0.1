-- V3.1 Slice 6: structured external links for gastro profiles and excursion operators
ALTER TABLE "GastroProfile" ADD COLUMN "bookingUrl" TEXT;
ALTER TABLE "GastroProfile" ADD COLUMN "socialLinks" JSONB;

ALTER TABLE "ExcursionOperator" ADD COLUMN "websiteUrl" TEXT;
ALTER TABLE "ExcursionOperator" ADD COLUMN "bookingUrl" TEXT;
ALTER TABLE "ExcursionOperator" ADD COLUMN "socialLinks" JSONB;
