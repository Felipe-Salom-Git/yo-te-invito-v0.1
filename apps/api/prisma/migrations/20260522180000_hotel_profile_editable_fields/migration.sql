-- Slice 10: campos editables portal hotel (sin booking)
ALTER TABLE "HotelProfile" ADD COLUMN IF NOT EXISTS "galleryUrls" JSONB;
ALTER TABLE "HotelProfile" ADD COLUMN IF NOT EXISTS "geoLat" DOUBLE PRECISION;
ALTER TABLE "HotelProfile" ADD COLUMN IF NOT EXISTS "geoLng" DOUBLE PRECISION;
ALTER TABLE "HotelProfile" ADD COLUMN IF NOT EXISTS "whatsappPhone" TEXT;
ALTER TABLE "HotelProfile" ADD COLUMN IF NOT EXISTS "amenities" JSONB;
