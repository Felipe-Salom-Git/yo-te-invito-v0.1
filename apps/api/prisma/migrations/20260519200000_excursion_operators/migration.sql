-- CreateTable
CREATE TABLE "ExcursionOperator" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "openingHours" JSONB,
    "openingHoursNote" TEXT,
    "contactPhone" TEXT,
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExcursionOperator_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "excursionOperatorId" TEXT;

-- CreateIndex
CREATE INDEX "ExcursionOperator_tenantId_idx" ON "ExcursionOperator"("tenantId");

-- CreateIndex
CREATE INDEX "ExcursionOperator_tenantId_isActive_idx" ON "ExcursionOperator"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Event_excursionOperatorId_idx" ON "Event"("excursionOperatorId");

-- CreateIndex
CREATE INDEX "Event_tenantId_category_excursionOperatorId_idx" ON "Event"("tenantId", "category", "excursionOperatorId");

-- AddForeignKey
ALTER TABLE "ExcursionOperator" ADD CONSTRAINT "ExcursionOperator_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_excursionOperatorId_fkey" FOREIGN KEY ("excursionOperatorId") REFERENCES "ExcursionOperator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
