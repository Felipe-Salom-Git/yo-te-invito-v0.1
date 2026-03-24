/**
 * Demo seed — tenant + admin only.
 * Elimina todos los usuarios excepto admin y los datos asociados.
 * Run: pnpm run demo:seed
 * Password: "demo"
 */

import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'demo';
const TENANT_ID = 'tenant-demo';
const ADMIN_EMAIL = 'admin@demo.local';
const CARGA_EMAIL = 'cuenta_cargas@demo.com';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt.toString('hex')}:${hash}`;
}

async function cleanupNonAdmin(tenantId: string, adminId: string, preserveCargaId: string | null) {
  const excludeIds = [adminId, preserveCargaId].filter(Boolean) as string[];
  const nonAdminIds = (
    await prisma.user.findMany({
      where: { tenantId, id: { notIn: excludeIds } },
      select: { id: true },
    })
  ).map((u) => u.id);

  if (nonAdminIds.length === 0) return;

  await prisma.$transaction([
    prisma.ticketTransfer.deleteMany({ where: { OR: [{ fromUserId: { in: nonAdminIds } }, { toUserId: { in: nonAdminIds } }] } }),
    prisma.review.deleteMany({ where: { userId: { in: nonAdminIds } } }),
    prisma.referralCommission.deleteMany({ where: { referrerId: { in: nonAdminIds } } }),
    prisma.referralLink.updateMany({ where: { referrerId: { in: nonAdminIds } }, data: { referrerId: null } }),
    prisma.courtesyGrant.deleteMany({ where: { createdById: { in: nonAdminIds } } }),
    prisma.ticket.updateMany({ where: { ownerUserId: { in: nonAdminIds } }, data: { ownerUserId: null } }),
  ]);

  const events = await prisma.event.findMany({ where: { tenantId }, select: { id: true } });
  const eventIds = events.map((e) => e.id);
  if (eventIds.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({ where: { order: { eventId: { in: eventIds } } } });
      await tx.ticket.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.orderItem.deleteMany({ where: { order: { eventId: { in: eventIds } } } });
      await tx.order.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.ticketType.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.payout.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.referralCommission.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.referralAttribution.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.referralLink.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.review.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.courtesyGrant.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.fraudSignal.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.ticketScanLog.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.ticketScan.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.eventMedia.deleteMany({ where: { eventId: { in: eventIds } } });
      await tx.event.deleteMany({ where: { id: { in: eventIds } } });
    });
  }

  await prisma.userProducerMembership.deleteMany({ where: { userId: { in: nonAdminIds } } });
  await prisma.userGastroMembership.deleteMany({ where: { userId: { in: nonAdminIds } } });
  await prisma.userReferrerMembership.deleteMany({ where: { userId: { in: nonAdminIds } } });
  await prisma.producerProfile.deleteMany({ where: { tenantId } });
  await prisma.gastroProfile.deleteMany({ where: { tenantId } });
  await prisma.referrerProfile.deleteMany({ where: { tenantId } });
  await prisma.roleApplication.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId, id: { in: nonAdminIds } } });
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: { id: TENANT_ID, name: 'Demo Tenant', isActive: true },
  });

  const passwordHash = hashPassword(DEMO_PASSWORD);

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: ADMIN_EMAIL } },
    update: { passwordHash },
    create: {
      id: 'user-admin',
      tenantId: tenant.id,
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const cargaUser = await prisma.user.findFirst({
    where: { tenantId: tenant.id, email: CARGA_EMAIL, deletedAt: null },
  });
  await cleanupNonAdmin(tenant.id, adminUser.id, cargaUser?.id ?? null);

  console.log('=== Demo seed complete (admin only) ===\n');
  console.log('TENANT_ID:', tenant.id);
  console.log('Admin:    ', adminUser.id, '  admin@demo.local');
  console.log('Password: demo');
  console.log('\nOtros usuarios se crean via registro y aplicaciones de perfil.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
