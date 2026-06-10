-- V3.1 Etapa 4 — Content tags (publication labels)

CREATE TABLE "ContentTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "categoryScope" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventTag" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentTag_tenantId_slug_key" ON "ContentTag"("tenantId", "slug");
CREATE INDEX "ContentTag_tenantId_isActive_idx" ON "ContentTag"("tenantId", "isActive");
CREATE INDEX "ContentTag_tenantId_categoryScope_isActive_idx" ON "ContentTag"("tenantId", "categoryScope", "isActive");

CREATE UNIQUE INDEX "EventTag_eventId_tagId_key" ON "EventTag"("eventId", "tagId");
CREATE INDEX "EventTag_eventId_idx" ON "EventTag"("eventId");
CREATE INDEX "EventTag_tagId_idx" ON "EventTag"("tagId");

ALTER TABLE "ContentTag" ADD CONSTRAINT "ContentTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventTag" ADD CONSTRAINT "EventTag_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventTag" ADD CONSTRAINT "EventTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ContentTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
