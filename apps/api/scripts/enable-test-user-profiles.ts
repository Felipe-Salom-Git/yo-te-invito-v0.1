/**
 * Enable all portal profiles + ADMIN for the test user (idempotent).
 * Run: pnpm --filter api run demo:enable-test-user-profiles
 */

import { PrismaClient } from '@prisma/client';

const EMAIL = (process.env.TEST_USER_EMAIL ?? 'felipe.e.salom@gmail.com').trim().toLowerCase();
const TENANT_ID = process.env.TENANT_ID ?? 'tenant-demo';

const prisma = new PrismaClient();

async function ensureMembership(
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

async function main() {
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    create: { id: TENANT_ID, name: 'Demo Tenant' },
    update: {},
  });

  const user = await prisma.user.findFirst({
    where: { tenantId: TENANT_ID, email: EMAIL, deletedAt: null },
  });

  if (!user) {
    console.error(`User not found: ${EMAIL}. Create the account first (register or manual).`);
    process.exit(1);
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
    where: { tenantId: TENANT_ID, createdByUserId: user.id },
  });
  if (!producer) {
    producer = await prisma.producerProfile.create({
      data: {
        tenantId: TENANT_ID,
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
  await ensureMembership('producer', TENANT_ID, user.id, producer.id);

  let gastro = await prisma.gastroProfile.findFirst({
    where: { tenantId: TENANT_ID, createdByUserId: user.id },
  });
  if (!gastro) {
    gastro = await prisma.gastroProfile.create({
      data: {
        tenantId: TENANT_ID,
        displayName: 'Local Gastronómico Test',
        summary: 'Local demo',
        city: 'Buenos Aires',
        province: 'CABA',
        address: 'Demo 123',
        contactEmail: EMAIL,
        status: 'ACTIVE',
        createdByUserId: user.id,
      },
    });
    console.log('  + gastro profile');
  } else if (gastro.status !== 'ACTIVE') {
    await prisma.gastroProfile.update({ where: { id: gastro.id }, data: { status: 'ACTIVE' } });
    console.log('  ~ gastro profile activated');
  }
  await ensureMembership('gastro', TENANT_ID, user.id, gastro.id);

  let hotel = await prisma.hotelProfile.findFirst({
    where: { tenantId: TENANT_ID, createdByUserId: user.id },
  });
  if (!hotel) {
    hotel = await prisma.hotelProfile.create({
      data: {
        tenantId: TENANT_ID,
        displayName: 'Hotel Test Felipe',
        websiteUrl: 'https://example.com',
        contactEmail: EMAIL,
        status: 'ACTIVE',
        createdByUserId: user.id,
      },
    });
    console.log('  + hotel profile');
  } else if (hotel.status !== 'ACTIVE') {
    await prisma.hotelProfile.update({ where: { id: hotel.id }, data: { status: 'ACTIVE' } });
    console.log('  ~ hotel profile activated');
  }
  await ensureMembership('hotel', TENANT_ID, user.id, hotel.id);

  let referrer = await prisma.referrerProfile.findFirst({
    where: { tenantId: TENANT_ID, createdByUserId: user.id },
  });
  if (!referrer) {
    const slug = `referido-felipe-${user.id.slice(-6)}`;
    referrer = await prisma.referrerProfile.create({
      data: {
        tenantId: TENANT_ID,
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
  await ensureMembership('referrer', TENANT_ID, user.id, referrer.id);

  console.log('\nDone. Mis Tickets is always available via USER base account.');
  console.log('Admin portal: user.role must be ADMIN (re-login if needed).');
  console.log('Scanner: use /dev/scanner-sim; ADMIN can scan on some endpoints.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
