-- CreateEnum
CREATE TYPE "GastroContentType" AS ENUM ('EDITORIAL', 'IMAGE');

-- CreateEnum
CREATE TYPE "GastroContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'INACTIVE');

-- CreateTable
CREATE TABLE "GastroContent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gastroProfileId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "GastroContentType" NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "GastroContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GastroContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GastroContent_tenantId_eventId_idx" ON "GastroContent"("tenantId", "eventId");

-- CreateIndex
CREATE INDEX "GastroContent_gastroProfileId_status_sortOrder_idx" ON "GastroContent"("gastroProfileId", "status", "sortOrder");

-- AddForeignKey
ALTER TABLE "GastroContent" ADD CONSTRAINT "GastroContent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastroContent" ADD CONSTRAINT "GastroContent_gastroProfileId_fkey" FOREIGN KEY ("gastroProfileId") REFERENCES "GastroProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastroContent" ADD CONSTRAINT "GastroContent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
