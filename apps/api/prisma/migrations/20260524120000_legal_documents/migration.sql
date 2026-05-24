-- CreateEnum
CREATE TYPE "LegalDocumentVisibility" AS ENUM ('PUBLIC', 'INTERNAL');

-- CreateEnum
CREATE TYPE "LegalDocumentVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LegalAcceptanceContext" AS ENUM ('SIGNUP', 'CHECKOUT', 'PROFILE_ONBOARDING', 'PORTAL_ACCESS');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'LEGAL_DOCUMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'LEGAL_DOCUMENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'LEGAL_DOCUMENT_DRAFT_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'LEGAL_DOCUMENT_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'LEGAL_DOCUMENT_ARCHIVED';

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "LegalDocumentVisibility" NOT NULL DEFAULT 'PUBLIC',
    "appliesToProfiles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isRequiredForSignup" BOOLEAN NOT NULL DEFAULT false,
    "isRequiredForCheckout" BOOLEAN NOT NULL DEFAULT false,
    "isRequiredForPortalAccess" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "LegalDocumentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "summary" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "context" "LegalAcceptanceContext" NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_tenantId_key_key" ON "LegalDocument"("tenantId", "key");

-- CreateIndex
CREATE INDEX "LegalDocument_tenantId_visibility_idx" ON "LegalDocument"("tenantId", "visibility");

-- CreateIndex
CREATE INDEX "LegalDocument_tenantId_isActive_idx" ON "LegalDocument"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocumentVersion_documentId_version_key" ON "LegalDocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "LegalDocumentVersion_documentId_status_idx" ON "LegalDocumentVersion"("documentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserLegalAcceptance_userId_documentVersionId_context_key" ON "UserLegalAcceptance"("userId", "documentVersionId", "context");

-- CreateIndex
CREATE INDEX "UserLegalAcceptance_userId_context_idx" ON "UserLegalAcceptance"("userId", "context");

-- CreateIndex
CREATE INDEX "UserLegalAcceptance_documentId_idx" ON "UserLegalAcceptance"("documentId");

-- CreateIndex
CREATE INDEX "UserLegalAcceptance_documentVersionId_idx" ON "UserLegalAcceptance"("documentVersionId");

-- AddForeignKey
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalDocumentVersion" ADD CONSTRAINT "LegalDocumentVersion_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLegalAcceptance" ADD CONSTRAINT "UserLegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLegalAcceptance" ADD CONSTRAINT "UserLegalAcceptance_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLegalAcceptance" ADD CONSTRAINT "UserLegalAcceptance_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "LegalDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
