-- Admin "publicaciones generales" (promotional content without ticketing)
ALTER TABLE "Event" ADD COLUMN "isGeneralPublication" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Event_tenantId_isGeneralPublication_idx" ON "Event"("tenantId", "isGeneralPublication");
