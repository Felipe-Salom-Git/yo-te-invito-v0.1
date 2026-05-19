-- Content subcategories + optional link on events
CREATE TABLE "ContentSubcategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "iconName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSubcategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentSubcategory_tenantId_category_slug_key" ON "ContentSubcategory"("tenantId", "category", "slug");
CREATE INDEX "ContentSubcategory_tenantId_category_idx" ON "ContentSubcategory"("tenantId", "category");
CREATE INDEX "ContentSubcategory_tenantId_category_isActive_idx" ON "ContentSubcategory"("tenantId", "category", "isActive");

ALTER TABLE "ContentSubcategory" ADD CONSTRAINT "ContentSubcategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Event" ADD COLUMN "subcategoryId" TEXT;

CREATE INDEX "Event_subcategoryId_idx" ON "Event"("subcategoryId");

ALTER TABLE "Event" ADD CONSTRAINT "Event_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "ContentSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
