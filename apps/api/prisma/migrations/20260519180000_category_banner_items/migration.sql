-- CreateTable
CREATE TABLE "CategoryBannerItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryBannerItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryBannerItem_tenantId_category_idx" ON "CategoryBannerItem"("tenantId", "category");

-- CreateIndex
CREATE INDEX "CategoryBannerItem_tenantId_category_isActive_idx" ON "CategoryBannerItem"("tenantId", "category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryBannerItem_tenantId_category_eventId_key" ON "CategoryBannerItem"("tenantId", "category", "eventId");

-- AddForeignKey
ALTER TABLE "CategoryBannerItem" ADD CONSTRAINT "CategoryBannerItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryBannerItem" ADD CONSTRAINT "CategoryBannerItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
