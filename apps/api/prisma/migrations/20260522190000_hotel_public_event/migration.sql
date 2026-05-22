-- Slice 11: vínculo ficha hotel ↔ evento público (reviews + /hoteles/[id])
ALTER TABLE "HotelProfile" ADD COLUMN IF NOT EXISTS "publicEventId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "HotelProfile_publicEventId_key" ON "HotelProfile"("publicEventId");

DO $$ BEGIN
  ALTER TABLE "HotelProfile" ADD CONSTRAINT "HotelProfile_publicEventId_fkey"
    FOREIGN KEY ("publicEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
