-- Resale marketplace V2: listings + ticket RESALE_PENDING

CREATE TYPE "ResaleListingStatus" AS ENUM ('ACTIVE', 'SOLD', 'CANCELLED');

ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'RESALE_PENDING';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RESALE_LISTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'RESALE_SOLD';

CREATE TABLE "ResaleListing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sellerUserId" TEXT NOT NULL,
    "buyerUserId" TEXT,
    "askingPriceCents" INTEGER NOT NULL,
    "platformFeeCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "status" "ResaleListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "soldAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResaleListing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ResaleListing_ticketId_key" ON "ResaleListing"("ticketId");
CREATE INDEX "ResaleListing_tenantId_status_idx" ON "ResaleListing"("tenantId", "status");
CREATE INDEX "ResaleListing_eventId_status_idx" ON "ResaleListing"("eventId", "status");
CREATE INDEX "ResaleListing_sellerUserId_status_idx" ON "ResaleListing"("sellerUserId", "status");
CREATE INDEX "ResaleListing_createdAt_idx" ON "ResaleListing"("createdAt");

ALTER TABLE "Ticket" ADD COLUMN "activeResaleListingId" TEXT;

CREATE UNIQUE INDEX "Ticket_activeResaleListingId_key" ON "Ticket"("activeResaleListingId");

ALTER TABLE "ResaleListing" ADD CONSTRAINT "ResaleListing_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResaleListing" ADD CONSTRAINT "ResaleListing_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResaleListing" ADD CONSTRAINT "ResaleListing_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResaleListing" ADD CONSTRAINT "ResaleListing_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResaleListing" ADD CONSTRAINT "ResaleListing_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_activeResaleListingId_fkey" FOREIGN KEY ("activeResaleListingId") REFERENCES "ResaleListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
