-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'PENDING', 'DISABLED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "producerProfileId" TEXT;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "producerProfileId" TEXT;

-- AlterTable
ALTER TABLE "ReferralLink" ADD COLUMN     "referrerProfileId" TEXT;

-- CreateTable
CREATE TABLE "ProducerProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "city" TEXT,
    "country" TEXT,
    "ratingAvg" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProducerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GastroProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "address" TEXT,
    "city" TEXT,
    "contactPhone" TEXT,
    "ratingAvg" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GastroProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferrerProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "publicHandle" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "createdByUserId" TEXT,
    "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferrerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProducerMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "membershipRole" "MembershipRole" NOT NULL DEFAULT 'OWNER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProducerMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGastroMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "membershipRole" "MembershipRole" NOT NULL DEFAULT 'OWNER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGastroMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReferrerMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "membershipRole" "MembershipRole" NOT NULL DEFAULT 'OWNER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReferrerMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProducerProfile_tenantId_idx" ON "ProducerProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ProducerProfile_tenantId_status_idx" ON "ProducerProfile"("tenantId", "status");

-- CreateIndex
CREATE INDEX "GastroProfile_tenantId_idx" ON "GastroProfile"("tenantId");

-- CreateIndex
CREATE INDEX "GastroProfile_tenantId_status_idx" ON "GastroProfile"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReferrerProfile_tenantId_idx" ON "ReferrerProfile"("tenantId");

-- CreateIndex
CREATE INDEX "ReferrerProfile_tenantId_status_idx" ON "ReferrerProfile"("tenantId", "status");

-- CreateIndex
CREATE INDEX "UserProducerMembership_tenantId_idx" ON "UserProducerMembership"("tenantId");

-- CreateIndex
CREATE INDEX "UserProducerMembership_userId_idx" ON "UserProducerMembership"("userId");

-- CreateIndex
CREATE INDEX "UserProducerMembership_profileId_idx" ON "UserProducerMembership"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProducerMembership_userId_profileId_key" ON "UserProducerMembership"("userId", "profileId");

-- CreateIndex
CREATE INDEX "UserGastroMembership_tenantId_idx" ON "UserGastroMembership"("tenantId");

-- CreateIndex
CREATE INDEX "UserGastroMembership_userId_idx" ON "UserGastroMembership"("userId");

-- CreateIndex
CREATE INDEX "UserGastroMembership_profileId_idx" ON "UserGastroMembership"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGastroMembership_userId_profileId_key" ON "UserGastroMembership"("userId", "profileId");

-- CreateIndex
CREATE INDEX "UserReferrerMembership_tenantId_idx" ON "UserReferrerMembership"("tenantId");

-- CreateIndex
CREATE INDEX "UserReferrerMembership_userId_idx" ON "UserReferrerMembership"("userId");

-- CreateIndex
CREATE INDEX "UserReferrerMembership_profileId_idx" ON "UserReferrerMembership"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "UserReferrerMembership_userId_profileId_key" ON "UserReferrerMembership"("userId", "profileId");

-- CreateIndex
CREATE INDEX "Event_producerProfileId_idx" ON "Event"("producerProfileId");

-- CreateIndex
CREATE INDEX "ReferralLink_referrerProfileId_idx" ON "ReferralLink"("referrerProfileId");

-- AddForeignKey
ALTER TABLE "ProducerProfile" ADD CONSTRAINT "ProducerProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GastroProfile" ADD CONSTRAINT "GastroProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferrerProfile" ADD CONSTRAINT "ReferrerProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProducerMembership" ADD CONSTRAINT "UserProducerMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProducerMembership" ADD CONSTRAINT "UserProducerMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProducerMembership" ADD CONSTRAINT "UserProducerMembership_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProducerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGastroMembership" ADD CONSTRAINT "UserGastroMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGastroMembership" ADD CONSTRAINT "UserGastroMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGastroMembership" ADD CONSTRAINT "UserGastroMembership_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "GastroProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferrerMembership" ADD CONSTRAINT "UserReferrerMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferrerMembership" ADD CONSTRAINT "UserReferrerMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReferrerMembership" ADD CONSTRAINT "UserReferrerMembership_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ReferrerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_producerProfileId_fkey" FOREIGN KEY ("producerProfileId") REFERENCES "ProducerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_referrerProfileId_fkey" FOREIGN KEY ("referrerProfileId") REFERENCES "ReferrerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
