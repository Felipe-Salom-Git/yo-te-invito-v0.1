-- Ticket canvas studio: persisted layout per ticket type (display metadata; QR payload unchanged at issuance).

CREATE TABLE "TicketTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
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

    CONSTRAINT "TicketTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketTemplate_tenantId_idx" ON "TicketTemplate"("tenantId");

ALTER TABLE "TicketTemplate" ADD CONSTRAINT "TicketTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "TicketType_ticketTemplateId_key" ON "TicketType"("ticketTemplateId");

ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_ticketTemplateId_fkey" FOREIGN KEY ("ticketTemplateId") REFERENCES "TicketTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
