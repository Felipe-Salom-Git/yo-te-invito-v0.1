/**
 * Idempotent: ADMIN + active producer/gastro/hotel/referrer profiles + memberships.
 * Used by demo:enable-test-user-profiles and db:cleanup-demo (--make-preserved-user-admin).
 */

import type { PrismaClient } from '@prisma/client';

async function ensureMembership(
  prisma: PrismaClient,
  kind: 'producer' | 'gastro' | 'hotel' | 'referrer',
  tenantId: string,
  userId: string,
  profileId: string,
) {
  if (kind === 'producer') {
    const existing = await prisma.userProducerMembership.findFirst({
      where: { tenantId, userId, profileId },
    });
    if (!existing) {
      await prisma.userProducerMembership.create({
        data: {
          tenantId,
          userId,
          profileId,
          membershipRole: 'OWNER',
          status: 'ACTIVE',
        },
      });
      console.log('  + producer membership');
    }
    return;
  }
  if (kind === 'gastro') {
    const existing = await prisma.userGastroMembership.findFirst({
      where: { tenantId, userId, profileId },
    });
    if (!existing) {
      await prisma.userGastroMembership.create({
        data: {
          tenantId,
          userId,
          profileId,
          membershipRole: 'OWNER',
          status: 'ACTIVE',
        },
      });
      console.log('  + gastro membership');
    }
    return;
  }
  if (kind === 'hotel') {
    const existing = await prisma.userHotelMembership.findFirst({
      where: { tenantId, userId, profileId },
    });
    if (!existing) {
      await prisma.userHotelMembership.create({
        data: {
          tenantId,
          userId,
          profileId,
          membershipRole: 'OWNER',
          status: 'ACTIVE',
        },
      });
      console.log('  + hotel membership');
    }
    return;
  }
  const existing = await prisma.userReferrerMembership.findFirst({
    where: { tenantId, userId, profileId },
  });
  if (!existing) {
    await prisma.userReferrerMembership.create({
      data: {
        tenantId,
        userId,
        profileId,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });
    console.log('  + referrer membership');
  }
}

export async function enableMasterUserProfiles(
  prisma: PrismaClient,
  options: { tenantId: string; userId: string; email: string },
): Promise<void> {
  const { tenantId, userId, email } = options;

  await prisma.tenant.upsert({
    where: { id: tenantId },
    create: { id: tenantId, name: 'Demo Tenant' },
    update: {},
  });

  const user = await prisma.user.findFirst({
    where: { tenantId, id: userId, deletedAt: null },
  });
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  console.log(`User: ${user.email} (${user.id})`);

  if (user.role !== 'ADMIN') {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN', status: 'ACTIVE' },
    });
    console.log('  ~ role set to ADMIN (JWT: sign out and sign in again)');
  } else {
    console.log('  = role already ADMIN');
  }

  let producer = await prisma.producerProfile.findFirst({
    where: { tenantId, createdByUserId: user.id },
  });
  if (!producer) {
    producer = await prisma.producerProfile.create({
      data: {
        tenantId,
        displayName: 'Productora Test Felipe',
        shortDescription: 'Perfil demo para pruebas',
        status: 'ACTIVE',
        createdByUserId: user.id,
      },
    });
    console.log('  + producer profile');
  } else if (producer.status !== 'ACTIVE') {
    await prisma.producerProfile.update({
      where: { id: producer.id },
      data: { status: 'ACTIVE' },
    });
    console.log('  ~ producer profile activated');
  }
  await ensureMembership(prisma, 'producer', tenantId, user.id, producer.id);

  let gastro = await prisma.gastroProfile.findFirst({
    where: { tenantId, createdByUserId: user.id },
  });
  if (!gastro) {
    gastro = await prisma.gastroProfile.create({
      data: {
        tenantId,
        displayName: 'Local Gastronómico Test',
        summary: 'Local demo',
        city: 'Buenos Aires',
        province: 'CABA',
        address: 'Demo 123',
        contactEmail: email,
        status: 'ACTIVE',
        createdByUserId: user.id,
      },
    });
    console.log('  + gastro profile');
  } else if (gastro.status !== 'ACTIVE') {
    await prisma.gastroProfile.update({ where: { id: gastro.id }, data: { status: 'ACTIVE' } });
    console.log('  ~ gastro profile activated');
  }
  await ensureMembership(prisma, 'gastro', tenantId, user.id, gastro.id);

  let hotel = await prisma.hotelProfile.findFirst({
    where: { tenantId, createdByUserId: user.id },
  });
  if (!hotel) {
    hotel = await prisma.hotelProfile.create({
      data: {
        tenantId,
        displayName: 'Hotel Test Felipe',
        websiteUrl: 'https://example.com',
        contactEmail: email,
        status: 'ACTIVE',
        createdByUserId: user.id,
      },
    });
    console.log('  + hotel profile');
  } else if (hotel.status !== 'ACTIVE') {
    await prisma.hotelProfile.update({ where: { id: hotel.id }, data: { status: 'ACTIVE' } });
    console.log('  ~ hotel profile activated');
  }
  await ensureMembership(prisma, 'hotel', tenantId, user.id, hotel.id);

  let referrer = await prisma.referrerProfile.findFirst({
    where: { tenantId, createdByUserId: user.id },
  });
  if (!referrer) {
    const slug = `referido-felipe-${user.id.slice(-6)}`;
    referrer = await prisma.referrerProfile.create({
      data: {
        tenantId,
        displayName: 'Referido Test Felipe',
        slug,
        publicHandle: slug,
        associationLinkToken: `tok-${user.id.slice(-8)}`,
        status: 'ACTIVE',
        createdByUserId: user.id,
      },
    });
    console.log('  + referrer profile');
  } else if (referrer.status !== 'ACTIVE') {
    await prisma.referrerProfile.update({ where: { id: referrer.id }, data: { status: 'ACTIVE' } });
    console.log('  ~ referrer profile activated');
  }
  await ensureMembership(prisma, 'referrer', tenantId, user.id, referrer.id);
}
