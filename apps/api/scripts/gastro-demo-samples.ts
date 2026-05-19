/**
 * Shared demo helpers: gastro@demo.local user + sample GastroDiscount rows
 * so home/detail show cupón badges without going through inbox approval.
 */

import type { PrismaClient } from '@prisma/client';

const GASTRO_DEMO_EMAIL = 'gastro@demo.local';
const DEMO_PASSWORD = 'demo';

export async function ensureGastroDemoUser(
  prisma: PrismaClient,
  tenantId: string,
  hashPassword: (password: string) => string,
): Promise<{ userId: string; gastroProfileId: string }> {
  let user = await prisma.user.findFirst({
    where: { tenantId, email: GASTRO_DEMO_EMAIL, deletedAt: null },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        tenantId,
        email: GASTRO_DEMO_EMAIL,
        passwordHash: hashPassword(DEMO_PASSWORD),
        firstName: 'Gastro',
        lastName: 'Demo',
        role: 'GASTRO_OWNER',
        status: 'ACTIVE',
      },
    });
    console.log(`Created user ${GASTRO_DEMO_EMAIL} (password: ${DEMO_PASSWORD})`);
  } else if (user.role !== 'GASTRO_OWNER') {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'GASTRO_OWNER' },
    });
    console.log(`Updated ${GASTRO_DEMO_EMAIL} role to GASTRO_OWNER`);
  }

  let profile = await prisma.gastroProfile.findFirst({
    where: {
      tenantId,
      memberships: { some: { userId: user.id, status: 'ACTIVE' } },
      status: 'ACTIVE',
    },
  });

  if (!profile) {
    profile = await prisma.gastroProfile.create({
      data: {
        tenantId,
        displayName: 'Gastro Demo — Yo Te Invito',
        description: 'Perfil demo para portal gastronómico y cupones',
        city: 'Buenos Aires',
        createdByUserId: user.id,
        status: 'ACTIVE',
      },
    });
    await prisma.userGastroMembership.create({
      data: {
        tenantId,
        userId: user.id,
        profileId: profile.id,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });
    console.log(`Created GastroProfile + membership for ${GASTRO_DEMO_EMAIL}`);
  }

  return { userId: user.id, gastroProfileId: profile.id };
}

/** One active discount per gastro event (skip events that already have any discount). */
export async function ensureSampleGastroDiscountsForHome(
  prisma: PrismaClient,
  tenantId: string,
  gastroProfileId: string,
): Promise<number> {
  const events = await prisma.event.findMany({
    where: {
      tenantId,
      category: 'gastro',
      status: 'APPROVED',
      deletedAt: null,
    },
    take: 8,
    orderBy: { startAt: 'asc' },
    select: {
      id: true,
      title: true,
      coverImageUrl: true,
    },
  });

  let created = 0;
  for (const ev of events) {
    const existing = await prisma.gastroDiscount.count({
      where: { tenantId, eventId: ev.id },
    });
    if (existing > 0) continue;

    const suffix = ev.id.replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase() || 'PROMO';
    const code = `DEMO-${suffix}`.slice(0, 40);

    await prisma.gastroDiscount.create({
      data: {
        tenantId,
        eventId: ev.id,
        gastroProfileId,
        code,
        type: 'PERCENT',
        value: 15,
        status: 'ACTIVE',
        displayTitle: `Promo demo · ${ev.title.slice(0, 60)}`,
        displayDescription:
          'Cupón de ejemplo generado por el seed: visible en inicio (Gastronomía) y en la ficha del local.',
        displayImageUrls: ev.coverImageUrl ? [ev.coverImageUrl] : undefined,
      },
    });
    created += 1;
  }

  if (created > 0) {
    console.log(
      `Created ${created} sample gastro discount(s) — home cards and restaurant detail will show “Cupón”.`,
    );
  } else if (events.length === 0) {
    console.log('No gastro events in tenant; skip sample discounts.');
  } else {
    console.log('Gastro events already have discounts; skip sample creation.');
  }

  return created;
}
