-- CreateEnum
CREATE TYPE "TicketDateChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'TICKET_DATE_CHANGE_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'TICKET_DATE_CHANGE_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'TICKET_DATE_CHANGE_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'TICKET_DATE_CHANGE_APPLIED';

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'TICKET_DATE_CHANGE_REQUESTED';
ALTER TYPE "NotificationKind" ADD VALUE 'TICKET_DATE_CHANGE_PENDING_PRODUCER';
ALTER TYPE "NotificationKind" ADD VALUE 'TICKET_DATE_CHANGE_APPROVED';
ALTER TYPE "NotificationKind" ADD VALUE 'TICKET_DATE_CHANGE_REJECTED';
ALTER TYPE "NotificationKind" ADD VALUE 'TICKET_DATE_CHANGE_APPLIED';

-- CreateTable
CREATE TABLE "TicketDateChangeRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "fromOccurrenceId" TEXT NOT NULL,
    "toOccurrenceId" TEXT NOT NULL,
    "fromTicketTypeId" TEXT,
    "toTicketTypeId" TEXT,
    "status" "TicketDateChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "rejectReason" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketDateChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketDateChangeRequest_tenantId_idx" ON "TicketDateChangeRequest"("tenantId");
CREATE INDEX "TicketDateChangeRequest_ticketId_idx" ON "TicketDateChangeRequest"("ticketId");
CREATE INDEX "TicketDateChangeRequest_ticketId_status_idx" ON "TicketDateChangeRequest"("ticketId", "status");
CREATE INDEX "TicketDateChangeRequest_tenantId_status_idx" ON "TicketDateChangeRequest"("tenantId", "status");
CREATE INDEX "TicketDateChangeRequest_fromOccurrenceId_idx" ON "TicketDateChangeRequest"("fromOccurrenceId");
CREATE INDEX "TicketDateChangeRequest_toOccurrenceId_idx" ON "TicketDateChangeRequest"("toOccurrenceId");

-- AddForeignKey
ALTER TABLE "TicketDateChangeRequest" ADD CONSTRAINT "TicketDateChangeRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketDateChangeRequest" ADD CONSTRAINT "TicketDateChangeRequest_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketDateChangeRequest" ADD CONSTRAINT "TicketDateChangeRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketDateChangeRequest" ADD CONSTRAINT "TicketDateChangeRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketDateChangeRequest" ADD CONSTRAINT "TicketDateChangeRequest_fromOccurrenceId_fkey" FOREIGN KEY ("fromOccurrenceId") REFERENCES "EventOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketDateChangeRequest" ADD CONSTRAINT "TicketDateChangeRequest_toOccurrenceId_fkey" FOREIGN KEY ("toOccurrenceId") REFERENCES "EventOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketDateChangeRequest" ADD CONSTRAINT "TicketDateChangeRequest_fromTicketTypeId_fkey" FOREIGN KEY ("fromTicketTypeId") REFERENCES "TicketType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketDateChangeRequest" ADD CONSTRAINT "TicketDateChangeRequest_toTicketTypeId_fkey" FOREIGN KEY ("toTicketTypeId") REFERENCES "TicketType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
