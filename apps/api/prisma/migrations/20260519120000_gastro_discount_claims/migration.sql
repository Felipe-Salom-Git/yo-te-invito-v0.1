-- CreateTable
CREATE TABLE "GastroDiscountClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "emailSendError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GastroDiscountClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GastroDiscountClaim_qrToken_key" ON "GastroDiscountClaim"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "GastroDiscountClaim_accessToken_key" ON "GastroDiscountClaim"("accessToken");

-- CreateIndex
CREATE UNIQUE INDEX "GastroDiscountClaim_discountId_email_key" ON "GastroDiscountClaim"("discountId", "email");

-- CreateIndex
CREATE INDEX "GastroDiscountClaim_tenantId_discountId_idx" ON "GastroDiscountClaim"("tenantId", "discountId");

-- CreateIndex
CREATE INDEX "GastroDiscountClaim_userId_idx" ON "GastroDiscountClaim"("userId");

-- AddForeignKey
ALTER TABLE "GastroDiscountClaim" ADD CONSTRAINT "GastroDiscountClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastroDiscountClaim" ADD CONSTRAINT "GastroDiscountClaim_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "GastroDiscount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastroDiscountClaim" ADD CONSTRAINT "GastroDiscountClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
