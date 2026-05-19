/**
 * Dev script: simulate door scans and validate ticket lifecycle.
 * Requires API running (pnpm dev:api) with DEV_AUTH_ENABLED=true.
 * Run: pnpm exec tsx scripts/test-door-scan.ts
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const BASE_URL = process.env.API_URL ?? 'http://localhost:3001';

function generateQrPayload(): string {
  return 'yti:v1:' + randomBytes(24).toString('hex');
}

async function main() {
  const prisma = new PrismaClient();

  console.log('=== Door scan simulation ===\n');

  // Step 1 — Setup
  const tenant = await prisma.tenant.upsert({
    where: { id: 'door-scan-test-tenant' },
    update: {},
    create: {
      id: 'door-scan-test-tenant',
      name: 'Door Scan Test Tenant',
      isActive: true,
    },
  });

  const [adminUser, producerUser, scannerUser] = await Promise.all([
    prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: tenant.id, email: 'admin@door-scan-test.local' },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'admin@door-scan-test.local',
        firstName: 'Admin',
        lastName: 'Test',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    }),
    prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: tenant.id, email: 'producer@door-scan-test.local' },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'producer@door-scan-test.local',
        firstName: 'Producer',
        lastName: 'Test',
        role: 'PRODUCER_OWNER',
        status: 'ACTIVE',
      },
    }),
    prisma.user.upsert({
      where: {
        tenantId_email: { tenantId: tenant.id, email: 'scanner@door-scan-test.local' },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        email: 'scanner@door-scan-test.local',
        firstName: 'Scanner',
        lastName: 'Test',
        role: 'SCANNER',
        status: 'ACTIVE',
      },
    }),
  ]);

  const startAt = new Date(Date.now() + 86400000); // tomorrow
  const endAt = new Date(startAt.getTime() + 7200000);

  const event = await prisma.event.upsert({
    where: { id: 'door-scan-test-event' },
    update: { status: 'APPROVED' },
    create: {
      id: 'door-scan-test-event',
      tenantId: tenant.id,
      producerId: producerUser.id,
      title: 'Door Scan Test Event',
      description: 'Test',
      startAt,
      endAt,
      status: 'APPROVED',
      isTicketingEnabled: true,
    },
  });

  const ticketType = await prisma.ticketType.upsert({
    where: { id: 'door-scan-test-tt' },
    update: {
      tenantId: tenant.id,
      capacityTotal: 10,
      capacityAvailable: 9,
    },
    create: {
      id: 'door-scan-test-tt',
      tenantId: tenant.id,
      eventId: event.id,
      name: 'General',
      price: 100,
      currency: 'ARS',
      capacityTotal: 10,
      capacityAvailable: 9,
      status: 'ACTIVE',
      batches: {
        create: {
          tenantId: tenant.id,
          eventId: event.id,
          orderIndex: 0,
          name: 'General',
          startAt,
          endAt,
          baseQuantity: 10,
          rolloverQuantity: 0,
          effectiveQuantity: 10,
          reservedQuantity: 0,
          soldCount: 1,
          price: 100,
          currency: 'ARS',
          status: 'ACTIVE',
        },
      },
    },
  });

  let scanBatch = await prisma.ticketBatch.findFirst({
    where: { ticketTypeId: ticketType.id, orderIndex: 0 },
  });
  if (!scanBatch) {
    scanBatch = await prisma.ticketBatch.create({
      data: {
        tenantId: tenant.id,
        eventId: event.id,
        ticketTypeId: ticketType.id,
        orderIndex: 0,
        name: 'General',
        startAt,
        endAt,
        baseQuantity: 10,
        rolloverQuantity: 0,
        effectiveQuantity: 10,
        reservedQuantity: 0,
        soldCount: 1,
        price: 100,
        currency: 'ARS',
        status: 'ACTIVE',
      },
    });
  }

  const qrPayload = generateQrPayload();

  const order = await prisma.order.upsert({
    where: { id: 'door-scan-test-order' },
    update: {},
    create: {
      id: 'door-scan-test-order',
      tenantId: tenant.id,
      eventId: event.id,
      status: 'PAID',
      buyerEmail: 'buyer@test.local',
      buyerFirstName: 'Buyer',
      buyerLastName: 'Test',
      totalAmount: 100,
      currency: 'ARS',
      paidAt: new Date(),
    },
  });

  const orderItem = await prisma.orderItem.upsert({
    where: { id: 'door-scan-test-oi' },
    update: { ticketBatchId: scanBatch.id },
    create: {
      id: 'door-scan-test-oi',
      orderId: order.id,
      ticketTypeId: ticketType.id,
      ticketBatchId: scanBatch.id,
      quantity: 1,
      unitPrice: 100,
      subtotal: 100,
    },
  });

  const ticket = await prisma.ticket.upsert({
    where: { id: 'door-scan-test-ticket' },
    update: { status: 'VALID', qrPayload, usedAt: null, ticketBatchId: scanBatch.id },
    create: {
      id: 'door-scan-test-ticket',
      orderId: order.id,
      orderItemId: orderItem.id,
      ticketTypeId: ticketType.id,
      ticketBatchId: scanBatch.id,
      eventId: event.id,
      qrPayload,
      status: 'VALID',
    },
  });

  console.log('Setup: tenant, event, ticketType, order, ticket created');
  console.log(`  qrPayload: ${qrPayload}`);
  console.log(`  scannerUserId: ${scannerUser.id}\n`);

  const scan = async () => {
    const res = await fetch(`${BASE_URL}/scanner/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Dev-User-Id': scannerUser.id,
      },
      body: JSON.stringify({ eventId: event.id, qrPayload }),
    });
    return res.json() as Promise<{ result: string; ticketId?: string; ticketTypeName?: string }>;
  };

  const getEventMetrics = async () => {
    const res = await fetch(`${BASE_URL}/producer/events/${event.id}/metrics`, {
      headers: { 'X-Dev-User-Id': producerUser.id },
    });
    return res.json() as Promise<{ scanCount: number }>;
  };

  const getPlatformMetrics = async () => {
    const res = await fetch(`${BASE_URL}/admin/platform/metrics`, {
      headers: { 'X-Dev-User-Id': adminUser.id },
    });
    return res.json() as Promise<{ totalScans: number }>;
  };

  // Step 2 — First scan
  console.log('Step 2 — First scan (POST /scanner/scan)');
  const firstResult = await scan();
  console.log(`  Response: ${JSON.stringify(firstResult)}`);

  if (firstResult.result !== 'OK') {
    console.error(`  FAIL: expected result=OK, got ${firstResult.result ?? '(not OK)'}`);
    const msg = (firstResult as { message?: string }).message;
    if (typeof msg === 'string' && msg.includes('Dev auth')) {
      console.error('  Hint: Start API with DEV_AUTH_ENABLED=true and NODE_ENV=development');
    }
    process.exit(1);
  }
  console.log('  OK: result=OK');

  const ticketAfterFirst = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticket.id },
  });
  if (ticketAfterFirst.status !== 'USED') {
    console.error(`  FAIL: expected Ticket.status=USED, got ${ticketAfterFirst.status}`);
    process.exit(1);
  }
  if (!ticketAfterFirst.usedAt) {
    console.error('  FAIL: expected Ticket.usedAt != null');
    process.exit(1);
  }
  console.log('  OK: Ticket.status=USED, usedAt set');

  const logCountAfterFirst = await prisma.ticketScanLog.count({
    where: { eventId: event.id, result: 'OK' },
  });
  if (logCountAfterFirst < 1) {
    console.error(`  FAIL: expected TicketScanLog with result=OK, got count=${logCountAfterFirst}`);
    process.exit(1);
  }
  console.log(`  OK: TicketScanLog created with result=OK\n`);

  // Step 3 — Check metrics
  console.log('Step 3 — Metrics');
  const eventMetrics = await getEventMetrics();
  const platformMetrics = await getPlatformMetrics();
  console.log(`  Event scanCount: ${eventMetrics.scanCount}`);
  console.log(`  Platform totalScans: ${platformMetrics.totalScans}`);

  if (eventMetrics.scanCount < 1) {
    console.error(`  FAIL: expected scanCount >= 1, got ${eventMetrics.scanCount}`);
    process.exit(1);
  }
  if (platformMetrics.totalScans < 1) {
    console.error(`  FAIL: expected totalScans >= 1, got ${platformMetrics.totalScans}`);
    process.exit(1);
  }
  console.log('  OK: metrics increased\n');

  const scanCountBeforeSecond = eventMetrics.scanCount;

  // Step 4 — Second scan (same ticket)
  console.log('Step 4 — Second scan (same qrPayload)');
  const secondResult = await scan();
  console.log(`  Response: ${JSON.stringify(secondResult)}`);

  if (secondResult.result !== 'ALREADY_USED') {
    console.error(`  FAIL: expected result=ALREADY_USED, got ${secondResult.result}`);
    process.exit(1);
  }
  console.log('  OK: result=ALREADY_USED');

  const ticketAfterSecond = await prisma.ticket.findUniqueOrThrow({
    where: { id: ticket.id },
  });
  if (ticketAfterSecond.status !== 'USED') {
    console.error(`  FAIL: expected Ticket.status=USED (unchanged), got ${ticketAfterSecond.status}`);
    process.exit(1);
  }
  console.log('  OK: Ticket.status still USED');

  const eventMetricsAfterSecond = await getEventMetrics();
  if (eventMetricsAfterSecond.scanCount !== scanCountBeforeSecond) {
    console.error(
      `  FAIL: scanCount should be unchanged (${scanCountBeforeSecond}), got ${eventMetricsAfterSecond.scanCount}`,
    );
    process.exit(1);
  }
  console.log(`  OK: scanCount unchanged (${scanCountBeforeSecond})`);

  const alreadyUsedLog = await prisma.ticketScanLog.findFirst({
    where: { eventId: event.id, ticketId: ticket.id, result: 'ALREADY_USED' },
  });
  if (!alreadyUsedLog) {
    console.error('  FAIL: expected TicketScanLog with result=ALREADY_USED');
    process.exit(1);
  }
  console.log('  OK: TicketScanLog created with result=ALREADY_USED\n');

  console.log('=== All checks passed ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = new PrismaClient();
    await prisma.$disconnect();
  });
