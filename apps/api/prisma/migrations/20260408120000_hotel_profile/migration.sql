-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'HOTEL_OWNER';

-- CreateTable
CREATE TABLE "HotelProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "address" TEXT,
    "city" TEXT,
    "starCategory" INTEGER,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "websiteUrl" TEXT,
    "bookingUrl" TEXT,
    "socialLinks" JSONB,
    "ratingAvg" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "status" "ProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HotelProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserHotelMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "membershipRole" "MembershipRole" NOT NULL DEFAULT 'OWNER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHotelMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HotelProfile_tenantId_idx" ON "HotelProfile"("tenantId");

-- CreateIndex
CREATE INDEX "HotelProfile_tenantId_status_idx" ON "HotelProfile"("tenantId", "status");

-- CreateIndex
CREATE INDEX "UserHotelMembership_tenantId_idx" ON "UserHotelMembership"("tenantId");

-- CreateIndex
CREATE INDEX "UserHotelMembership_userId_idx" ON "UserHotelMembership"("userId");

-- CreateIndex
CREATE INDEX "UserHotelMembership_profileId_idx" ON "UserHotelMembership"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "UserHotelMembership_userId_profileId_key" ON "UserHotelMembership"("userId", "profileId");

-- AddForeignKey
ALTER TABLE "HotelProfile" ADD CONSTRAINT "HotelProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHotelMembership" ADD CONSTRAINT "UserHotelMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHotelMembership" ADD CONSTRAINT "UserHotelMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserHotelMembership" ADD CONSTRAINT "UserHotelMembership_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "HotelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
