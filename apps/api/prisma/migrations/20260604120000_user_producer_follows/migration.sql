-- CreateTable
CREATE TABLE "UserProducerFollow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "producerProfileId" TEXT NOT NULL,
    "webNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProducerFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserProducerFollow_tenantId_userId_idx" ON "UserProducerFollow"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "UserProducerFollow_tenantId_producerProfileId_idx" ON "UserProducerFollow"("tenantId", "producerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProducerFollow_tenantId_userId_producerProfileId_key" ON "UserProducerFollow"("tenantId", "userId", "producerProfileId");

-- AddForeignKey
ALTER TABLE "UserProducerFollow" ADD CONSTRAINT "UserProducerFollow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProducerFollow" ADD CONSTRAINT "UserProducerFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProducerFollow" ADD CONSTRAINT "UserProducerFollow_producerProfileId_fkey" FOREIGN KEY ("producerProfileId") REFERENCES "ProducerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
