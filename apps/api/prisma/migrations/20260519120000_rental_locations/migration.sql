-- Rental locations (locales) + products linked via Event.rentalLocationId

CREATE TABLE "RentalLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RentalLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RentalLocation_tenantId_idx" ON "RentalLocation"("tenantId");
CREATE INDEX "RentalLocation_tenantId_isActive_idx" ON "RentalLocation"("tenantId", "isActive");

ALTER TABLE "RentalLocation" ADD CONSTRAINT "RentalLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Event" ADD COLUMN "rentalLocationId" TEXT;

CREATE INDEX "Event_rentalLocationId_idx" ON "Event"("rentalLocationId");
CREATE INDEX "Event_tenantId_category_rentalLocationId_idx" ON "Event"("tenantId", "category", "rentalLocationId");

ALTER TABLE "Event" ADD CONSTRAINT "Event_rentalLocationId_fkey" FOREIGN KEY ("rentalLocationId") REFERENCES "RentalLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
