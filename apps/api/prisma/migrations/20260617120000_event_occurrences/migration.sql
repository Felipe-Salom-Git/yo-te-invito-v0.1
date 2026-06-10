-- V3.1 Etapa 7 Slice 7.1 — Event occurrences (multi-date events base model)

CREATE TYPE "EventOccurrenceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED');

CREATE TABLE "EventOccurrence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "venueName" TEXT,
    "venueAddress" TEXT,
    "city" TEXT,
    "province" TEXT,
    "googlePlaceId" TEXT,
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "capacity" INTEGER,
    "status" "EventOccurrenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventOccurrence_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TicketType" ADD COLUMN "occurrenceId" TEXT;

CREATE INDEX "EventOccurrence_tenantId_idx" ON "EventOccurrence"("tenantId");
CREATE INDEX "EventOccurrence_eventId_idx" ON "EventOccurrence"("eventId");
CREATE INDEX "EventOccurrence_tenantId_eventId_idx" ON "EventOccurrence"("tenantId", "eventId");
CREATE INDEX "EventOccurrence_eventId_status_startAt_idx" ON "EventOccurrence"("eventId", "status", "startAt");
CREATE INDEX "EventOccurrence_eventId_sortOrder_idx" ON "EventOccurrence"("eventId", "sortOrder");
CREATE INDEX "TicketType_occurrenceId_idx" ON "TicketType"("occurrenceId");

ALTER TABLE "EventOccurrence" ADD CONSTRAINT "EventOccurrence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventOccurrence" ADD CONSTRAINT "EventOccurrence_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "EventOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
