-- CreateEnum
CREATE TYPE "ScanResult" AS ENUM ('OK', 'ALREADY_USED', 'INVALID', 'REVOKED');

-- AlterTable: add usedAt to Ticket
ALTER TABLE "Ticket" ADD COLUMN "usedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TicketScanLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketId" TEXT,
    "qrPayload" TEXT NOT NULL,
    "deviceId" TEXT,
    "scannerId" TEXT,
    "result" "ScanResult" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketScanLog_tenantId_idx" ON "TicketScanLog"("tenantId");

-- CreateIndex
CREATE INDEX "TicketScanLog_eventId_idx" ON "TicketScanLog"("eventId");

-- CreateIndex
CREATE INDEX "TicketScanLog_ticketId_idx" ON "TicketScanLog"("ticketId");

-- AddForeignKey
ALTER TABLE "TicketScanLog" ADD CONSTRAINT "TicketScanLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketScanLog" ADD CONSTRAINT "TicketScanLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketScanLog" ADD CONSTRAINT "TicketScanLog_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
