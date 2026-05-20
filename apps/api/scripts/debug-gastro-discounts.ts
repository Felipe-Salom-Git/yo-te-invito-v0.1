import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const discounts = await prisma.gastroDiscount.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      displayTitle: true,
      status: true,
      gastroProfileId: true,
      eventId: true,
      tenantId: true,
      createdAt: true,
    },
  });

  const profiles = await prisma.gastroProfile.findMany({
    select: {
      id: true,
      displayName: true,
      publicEventId: true,
      status: true,
      tenantId: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  console.log('--- Discounts (latest) ---');
  for (const d of discounts) {
    const profile = profiles.find((p) => p.id === d.gastroProfileId);
    const byEvent = profiles.find((p) => p.publicEventId === d.eventId);
    console.log(JSON.stringify({
      id: d.id,
      title: d.displayTitle,
      status: d.status,
      gastroProfileId: d.gastroProfileId,
      gastroProfileName: profile?.displayName ?? null,
      eventId: d.eventId,
      eventProfileId: byEvent?.id ?? null,
      eventProfileName: byEvent?.displayName ?? null,
      mismatch: d.gastroProfileId && byEvent && d.gastroProfileId !== byEvent.id,
    }));
  }

  console.log('\n--- Profiles ---');
  for (const p of profiles) {
    console.log(JSON.stringify({
      id: p.id,
      name: p.displayName,
      status: p.status,
      publicEventId: p.publicEventId,
    }));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
