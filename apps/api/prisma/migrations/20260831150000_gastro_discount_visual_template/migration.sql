-- V3.3 Etapa 6: visual template 1:0..1 per GastroDiscount (QR Studio). Presentation only.

CREATE TABLE "GastroDiscountTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gastroDiscountId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Diseño personalizado',
    "canvasWidth" INTEGER NOT NULL DEFAULT 320,
    "canvasHeight" INTEGER NOT NULL DEFAULT 560,
    "backgroundType" TEXT NOT NULL DEFAULT 'SOLID',
    "backgroundValue" TEXT NOT NULL DEFAULT '#0a0a0a',
    "elementsJson" JSONB NOT NULL DEFAULT '[]',
    "qrZoneJson" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,

    CONSTRAINT "GastroDiscountTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GastroDiscountTemplate_gastroDiscountId_key" ON "GastroDiscountTemplate"("gastroDiscountId");
CREATE INDEX "GastroDiscountTemplate_tenantId_idx" ON "GastroDiscountTemplate"("tenantId");

ALTER TABLE "GastroDiscountTemplate"
  ADD CONSTRAINT "GastroDiscountTemplate_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GastroDiscountTemplate"
  ADD CONSTRAINT "GastroDiscountTemplate_gastroDiscountId_fkey"
  FOREIGN KEY ("gastroDiscountId") REFERENCES "GastroDiscount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GastroDiscountTemplate"
  ADD CONSTRAINT "GastroDiscountTemplate_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GastroDiscountTemplate"
  ADD CONSTRAINT "GastroDiscountTemplate_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GASTRO_DISCOUNT_TEMPLATE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GASTRO_DISCOUNT_TEMPLATE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'GASTRO_DISCOUNT_TEMPLATE_RESET';
