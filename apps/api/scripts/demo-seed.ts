/**
 * Demo seed — tenant, users, event, ticket types for end-to-end testing.
 * Run: pnpm run demo:seed
 * Prerequisites: db migrated.
 * Password for all users: "demo"
 */

import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'demo';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt.toString('hex')}:${hash}`;
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-demo' },
    update: {},
    create: {
      id: 'tenant-demo',
      name: 'Demo Tenant',
      isActive: true,
    },
  });

  const passwordHash = hashPassword(DEMO_PASSWORD);

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.local' } },
    update: { passwordHash },
    create: {
      id: 'user-admin',
      tenantId: tenant.id,
      email: 'admin@demo.local',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const producerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'producer@demo.local' } },
    update: { passwordHash },
    create: {
      id: 'user-producer',
      tenantId: tenant.id,
      email: 'producer@demo.local',
      passwordHash,
      firstName: 'Producer',
      lastName: 'User',
      role: 'PRODUCER_OWNER',
      status: 'ACTIVE',
    },
  });

  const gastroUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'gastro@demo.local' } },
    update: { passwordHash },
    create: {
      id: 'user-gastro',
      tenantId: tenant.id,
      email: 'gastro@demo.local',
      passwordHash,
      firstName: 'Gastro',
      lastName: 'User',
      role: 'GASTRO_OWNER',
      status: 'ACTIVE',
    },
  });

  const referrerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'referrer@demo.local' } },
    update: { passwordHash },
    create: {
      id: 'user-referrer',
      tenantId: tenant.id,
      email: 'referrer@demo.local',
      passwordHash,
      firstName: 'Referrer',
      lastName: 'User',
      role: 'REFERRER',
      status: 'ACTIVE',
    },
  });

  const scannerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'scanner@demo.local' } },
    update: { passwordHash },
    create: {
      id: 'user-scanner',
      tenantId: tenant.id,
      email: 'scanner@demo.local',
      passwordHash,
      firstName: 'Scanner',
      lastName: 'Operator',
      role: 'SCANNER',
      status: 'ACTIVE',
    },
  });

  const buyerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'user@demo.local' } },
    update: { passwordHash },
    create: {
      id: 'user-buyer',
      tenantId: tenant.id,
      email: 'user@demo.local',
      passwordHash,
      firstName: 'Buyer',
      lastName: 'User',
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  const startAt = new Date();
  startAt.setDate(startAt.getDate() + 1);
  startAt.setHours(20, 0, 0, 0);
  const endAt = new Date(startAt.getTime() + 3 * 60 * 60 * 1000);

  const event = await prisma.event.upsert({
    where: { id: 'demo-event' },
    update: { status: 'APPROVED' },
    create: {
      id: 'demo-event',
      tenantId: tenant.id,
      producerId: producerUser.id,
      title: 'Demo Concert',
      description: 'Demo event for testing',
      startAt,
      endAt,
      city: 'Buenos Aires',
      venueName: 'Demo Venue',
      venueAddress: 'Av. Demo 123',
      status: 'APPROVED',
      isTicketingEnabled: true,
      capacityTotal: 100,
    },
  });

  const [ttGeneral, ttVip] = await Promise.all([
    prisma.ticketType.upsert({
      where: { id: 'demo-tt-general' },
      update: {},
      create: {
        id: 'demo-tt-general',
        eventId: event.id,
        name: 'General',
        description: 'General admission',
        price: 5000,
        currency: 'ARS',
        capacityTotal: 80,
        capacityAvailable: 80,
        maxPerOrder: 10,
        status: 'ACTIVE',
      },
    }),
    prisma.ticketType.upsert({
      where: { id: 'demo-tt-vip' },
      update: {},
      create: {
        id: 'demo-tt-vip',
        eventId: event.id,
        name: 'VIP',
        description: 'VIP access',
        price: 500,
        currency: 'ARS',
        capacityTotal: 20,
        capacityAvailable: 20,
        maxPerOrder: 4,
        status: 'ACTIVE',
      },
    }),
  ]);

  console.log('=== Demo seed complete ===\n');
  console.log('TENANT_ID:', tenant.id);
  console.log('EVENT_ID:', event.id);
  console.log('');
  console.log('Users (use X-Dev-User-Id for requests):');
  console.log('  ADMIN:         ', adminUser.id, '  admin@demo.local');
  console.log('  PRODUCER_OWNER:', producerUser.id, '  producer@demo.local');
  console.log('  SCANNER:       ', scannerUser.id, '  scanner@demo.local');
  console.log('  USER (buyer):  ', buyerUser.id, '  user@demo.local');
  console.log('');
  console.log('Ticket types:');
  console.log('  General:', ttGeneral.id, '- 5000 ARS');
  console.log('  VIP:    ', ttVip.id, '- 500 ARS');
  console.log('');
  console.log('For order creation use user@demo.local as buyerEmail to link tickets to user.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
