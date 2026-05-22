-- CreateEnum
CREATE TYPE "ReferralPaymentRequestStatus" AS ENUM ('REQUESTED', 'IN_REVIEW', 'PAID', 'REJECTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_PAYMENT_REQUEST_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'REFERRAL_PAYMENT_REQUEST_STATUS_CHANGED';

-- CreateTable
CREATE TABLE "ReferralPaymentRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "referrerProfileId" TEXT NOT NULL,
    "producerProfileId" TEXT NOT NULL,
    "amountRequestedCents" INTEGER NOT NULL,
    "message" TEXT,
    "status" "ReferralPaymentRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "rejectReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inReviewAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralPaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralPaymentRequestItem" (
    "id" TEXT NOT NULL,
    "paymentRequestId" TEXT NOT NULL,
    "commissionId" TEXT NOT NULL,

    CONSTRAINT "ReferralPaymentRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferralPaymentRequest_tenantId_idx" ON "ReferralPaymentRequest"("tenantId");

-- CreateIndex
CREATE INDEX "ReferralPaymentRequest_referrerProfileId_idx" ON "ReferralPaymentRequest"("referrerProfileId");

-- CreateIndex
CREATE INDEX "ReferralPaymentRequest_producerProfileId_idx" ON "ReferralPaymentRequest"("producerProfileId");

-- CreateIndex
CREATE INDEX "ReferralPaymentRequest_tenantId_producerProfileId_status_idx" ON "ReferralPaymentRequest"("tenantId", "producerProfileId", "status");

-- CreateIndex
CREATE INDEX "ReferralPaymentRequest_tenantId_referrerProfileId_status_idx" ON "ReferralPaymentRequest"("tenantId", "referrerProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPaymentRequestItem_commissionId_key" ON "ReferralPaymentRequestItem"("commissionId");

-- CreateIndex
CREATE INDEX "ReferralPaymentRequestItem_paymentRequestId_idx" ON "ReferralPaymentRequestItem"("paymentRequestId");

-- AddForeignKey
ALTER TABLE "ReferralPaymentRequest" ADD CONSTRAINT "ReferralPaymentRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralPaymentRequest" ADD CONSTRAINT "ReferralPaymentRequest_referrerProfileId_fkey" FOREIGN KEY ("referrerProfileId") REFERENCES "ReferrerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralPaymentRequest" ADD CONSTRAINT "ReferralPaymentRequest_producerProfileId_fkey" FOREIGN KEY ("producerProfileId") REFERENCES "ProducerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralPaymentRequestItem" ADD CONSTRAINT "ReferralPaymentRequestItem_paymentRequestId_fkey" FOREIGN KEY ("paymentRequestId") REFERENCES "ReferralPaymentRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralPaymentRequestItem" ADD CONSTRAINT "ReferralPaymentRequestItem_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "ReferralCommission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
