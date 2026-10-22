-- G4.1/G4.2 — GastroProfile page-view time series (page views, not unique visitors).
ALTER TABLE "GastroProfile" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "GastroProfileView" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gastroProfileId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewerUserId" TEXT,

    CONSTRAINT "GastroProfileView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GastroProfileView_tenantId_gastroProfileId_viewedAt_idx"
  ON "GastroProfileView"("tenantId", "gastroProfileId", "viewedAt");

CREATE INDEX "GastroProfileView_gastroProfileId_viewedAt_idx"
  ON "GastroProfileView"("gastroProfileId", "viewedAt");

ALTER TABLE "GastroProfileView"
  ADD CONSTRAINT "GastroProfileView_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GastroProfileView"
  ADD CONSTRAINT "GastroProfileView_gastroProfileId_fkey"
  FOREIGN KEY ("gastroProfileId") REFERENCES "GastroProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
