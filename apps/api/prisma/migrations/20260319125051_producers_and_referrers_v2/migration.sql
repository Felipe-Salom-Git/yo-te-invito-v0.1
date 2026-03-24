/*
  Warnings:

  - You are about to drop the column `bannerUrl` on the `ProducerProfile` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `ProducerProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `ProducerProfile` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "RelationshipOrigin" AS ENUM ('REQUESTED_BY_REFERRER', 'INVITED_BY_PRODUCER', 'FREELANCE_CONTACT');

-- CreateEnum
CREATE TYPE "EventAssignmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED');

-- AlterTable
ALTER TABLE "ProducerProfile" DROP COLUMN "bannerUrl",
DROP COLUMN "description",
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "longDescription" TEXT,
ADD COLUMN     "primaryEmail" TEXT,
ADD COLUMN     "primaryPhone" TEXT,
ADD COLUMN     "secondaryEmail" TEXT,
ADD COLUMN     "secondaryPhone" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "socialLinks" JSONB,
ADD COLUMN     "whatsapp" TEXT;

-- AlterTable
ALTER TABLE "ReferrerProfile" ADD COLUMN     "completedSales" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "salesScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ProducerReferrerRelationship" (
    "id" TEXT NOT NULL,
    "producerProfileId" TEXT NOT NULL,
    "referrerProfileId" TEXT NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "origin" "RelationshipOrigin" NOT NULL DEFAULT 'REQUESTED_BY_REFERRER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProducerReferrerRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventReferrerAssignment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "producerProfileId" TEXT NOT NULL,
    "referrerProfileId" TEXT NOT NULL,
    "referralLinkId" TEXT,
    "courtesyQuota" INTEGER NOT NULL DEFAULT 0,
    "courtesyUsedCount" INTEGER NOT NULL DEFAULT 0,
    "salesScoreSnapshot" DOUBLE PRECISION,
    "status" "EventAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventReferrerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProducerReferrerRelationship_producerProfileId_idx" ON "ProducerReferrerRelationship"("producerProfileId");

-- CreateIndex
CREATE INDEX "ProducerReferrerRelationship_referrerProfileId_idx" ON "ProducerReferrerRelationship"("referrerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProducerReferrerRelationship_producerProfileId_referrerProf_key" ON "ProducerReferrerRelationship"("producerProfileId", "referrerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "EventReferrerAssignment_referralLinkId_key" ON "EventReferrerAssignment"("referralLinkId");

-- CreateIndex
CREATE INDEX "EventReferrerAssignment_eventId_idx" ON "EventReferrerAssignment"("eventId");

-- CreateIndex
CREATE INDEX "EventReferrerAssignment_producerProfileId_idx" ON "EventReferrerAssignment"("producerProfileId");

-- CreateIndex
CREATE INDEX "EventReferrerAssignment_referrerProfileId_idx" ON "EventReferrerAssignment"("referrerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "EventReferrerAssignment_eventId_producerProfileId_referrerP_key" ON "EventReferrerAssignment"("eventId", "producerProfileId", "referrerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProducerProfile_slug_key" ON "ProducerProfile"("slug");

-- AddForeignKey
ALTER TABLE "ProducerReferrerRelationship" ADD CONSTRAINT "ProducerReferrerRelationship_producerProfileId_fkey" FOREIGN KEY ("producerProfileId") REFERENCES "ProducerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProducerReferrerRelationship" ADD CONSTRAINT "ProducerReferrerRelationship_referrerProfileId_fkey" FOREIGN KEY ("referrerProfileId") REFERENCES "ReferrerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReferrerAssignment" ADD CONSTRAINT "EventReferrerAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReferrerAssignment" ADD CONSTRAINT "EventReferrerAssignment_producerProfileId_fkey" FOREIGN KEY ("producerProfileId") REFERENCES "ProducerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReferrerAssignment" ADD CONSTRAINT "EventReferrerAssignment_referrerProfileId_fkey" FOREIGN KEY ("referrerProfileId") REFERENCES "ReferrerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventReferrerAssignment" ADD CONSTRAINT "EventReferrerAssignment_referralLinkId_fkey" FOREIGN KEY ("referralLinkId") REFERENCES "ReferralLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
