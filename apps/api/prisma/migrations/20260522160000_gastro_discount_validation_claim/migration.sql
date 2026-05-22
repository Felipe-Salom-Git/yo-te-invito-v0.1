-- AlterTable
ALTER TABLE "GastroDiscountValidation" ADD COLUMN "claimId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "GastroDiscountValidation_claimId_key" ON "GastroDiscountValidation"("claimId");

-- AddForeignKey
ALTER TABLE "GastroDiscountValidation" ADD CONSTRAINT "GastroDiscountValidation_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "GastroDiscountClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;
