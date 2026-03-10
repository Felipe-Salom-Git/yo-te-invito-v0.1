-- AlterTable
ALTER TABLE "TicketScan" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "FraudSignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "deviceId" TEXT,
    "ipAddress" TEXT,
    "scanCount" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FraudSignal_tenantId_idx" ON "FraudSignal"("tenantId");

-- CreateIndex
CREATE INDEX "FraudSignal_eventId_idx" ON "FraudSignal"("eventId");

-- CreateIndex
CREATE INDEX "FraudSignal_eventId_createdAt_idx" ON "FraudSignal"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "FraudSignal_eventId_signalType_idx" ON "FraudSignal"("eventId", "signalType");

-- CreateIndex
CREATE INDEX "TicketScan_tenantId_createdAt_idx" ON "TicketScan"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketScan_eventId_createdAt_idx" ON "TicketScan"("eventId", "createdAt");

-- AddForeignKey
ALTER TABLE "FraudSignal" ADD CONSTRAINT "FraudSignal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudSignal" ADD CONSTRAINT "FraudSignal_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
