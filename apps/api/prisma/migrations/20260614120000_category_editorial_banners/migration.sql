-- V3.1 Slice 10 — editorial category banners (admin-managed hero images)

CREATE TABLE "CategoryEditorialBanner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imageObjectKey" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryEditorialBanner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CategoryEditorialBanner_tenantId_category_idx" ON "CategoryEditorialBanner"("tenantId", "category");
CREATE INDEX "CategoryEditorialBanner_tenantId_category_isActive_idx" ON "CategoryEditorialBanner"("tenantId", "category", "isActive");
CREATE INDEX "CategoryEditorialBanner_tenantId_category_sortOrder_idx" ON "CategoryEditorialBanner"("tenantId", "category", "sortOrder");

ALTER TABLE "CategoryEditorialBanner" ADD CONSTRAINT "CategoryEditorialBanner_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CATEGORY_EDITORIAL_BANNER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CATEGORY_EDITORIAL_BANNER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CATEGORY_EDITORIAL_BANNER_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CATEGORY_EDITORIAL_BANNER_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CATEGORY_EDITORIAL_BANNER_REORDERED';
