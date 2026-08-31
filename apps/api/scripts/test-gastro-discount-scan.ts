/**
 * Dev script: validate gastro discount QR via scanner API.
 * Requires API running (pnpm dev:api) with DEV_AUTH_ENABLED=true.
 * Run: pnpm --filter api run test:gastro-discount-scan
 */

import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  buildGastroDiscountQrPayload,
  normalizeGastroDiscountExpiryDate,
} from '@yo-te-invito/shared';

const BASE_URL = process.env.API_URL ?? 'http://localhost:3001';

async function postValidate(
  scannerUserId: string,
  qrPayload: string,
): Promise<{ status: string; title: string; message: string }> {
  const res = await fetch(`${BASE_URL}/scanner/gastro-discounts/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Dev-User-Id': scannerUserId,
    },
    body: JSON.stringify({ qrPayload }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

async function main() {
  const prisma = new PrismaClient();
  console.log('=== Gastro discount scanner validation ===\n');

  const tenant = await prisma.tenant.upsert({
    where: { id: 'gastro-scan-test-tenant' },
    update: {},
    create: {
      id: 'gastro-scan-test-tenant',
      name: 'Gastro Scan Test',
      isActive: true,
    },
  });

  const scannerUser = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'scanner@gastro-scan-test.local' },
    },
    update: { role: 'SCANNER', status: 'ACTIVE' },
    create: {
      tenantId: tenant.id,
      email: 'scanner@gastro-scan-test.local',
      firstName: 'Scanner',
      lastName: 'Gastro',
      role: 'SCANNER',
      status: 'ACTIVE',
    },
  });

  const patronUser = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'patron@gastro-scan-test.local' },
    },
    update: { status: 'ACTIVE' },
    create: {
      tenantId: tenant.id,
      email: 'patron@gastro-scan-test.local',
      firstName: 'Patron',
      lastName: 'Test',
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  const event = await prisma.event.upsert({
    where: { id: 'gastro-scan-test-event' },
    update: { category: 'gastro', deletedAt: null },
    create: {
      id: 'gastro-scan-test-event',
      tenantId: tenant.id,
      producerId: scannerUser.id,
      title: 'Gastro Scan Test',
      description: 'Test',
      startAt: new Date(Date.now() + 86400000),
      endAt: new Date(Date.now() + 90000000),
      status: 'APPROVED',
      category: 'gastro',
      isTicketingEnabled: false,
    },
  });

  const profile = await prisma.gastroProfile.upsert({
    where: { id: 'gastro-scan-test-profile' },
    update: { status: 'ACTIVE', publicEventId: event.id },
    create: {
      id: 'gastro-scan-test-profile',
      tenantId: tenant.id,
      publicEventId: event.id,
      displayName: 'Test Local',
      status: 'ACTIVE',
    },
  });

  const expiresToday = normalizeGastroDiscountExpiryDate(new Date());

  const claimToken = randomBytes(24).toString('hex');
  const discount = await prisma.gastroDiscount.upsert({
    where: { eventId_code: { eventId: event.id, code: 'SCAN-TEST-01' } },
    update: {
      status: 'ACTIVE',
      discountDate: expiresToday,
      validTo: expiresToday,
      displayTitle: '2x1 Test',
    },
    create: {
      tenantId: tenant.id,
      eventId: event.id,
      gastroProfileId: profile.id,
      code: 'SCAN-TEST-01',
      type: 'PERCENT',
      value: 20,
      status: 'ACTIVE',
      displayTitle: '2x1 Test',
      discountDate: expiresToday,
      validTo: expiresToday,
      qrToken: randomBytes(24).toString('hex'),
    },
  });

  const claim = await prisma.gastroDiscountClaim.upsert({
    where: {
      discountId_email: {
        discountId: discount.id,
        email: 'guest@gastro-scan.test',
      },
    },
    update: { qrToken: claimToken, status: 'ACTIVE', usedAt: null, expiresAt: expiresToday },
    create: {
      tenantId: tenant.id,
      discountId: discount.id,
      email: 'guest@gastro-scan.test',
      qrToken: claimToken,
      accessToken: randomBytes(32).toString('hex'),
      expiresAt: expiresToday,
      status: 'ACTIVE',
    },
  });

  await prisma.gastroDiscountValidation.deleteMany({
    where: { discountId: discount.id },
  });

  const validPayload = buildGastroDiscountQrPayload(discount.id, claim.qrToken);
  const badTokenPayload = buildGastroDiscountQrPayload(discount.id, 'b'.repeat(32));
  const malformed = 'yti:gastro-discount:v1:bad';

  const r1 = await postValidate(scannerUser.id, validPayload);
  assert(r1.status === 'VALID', 'valid claim QR (expires today) → VALID');

  const r2 = await postValidate(scannerUser.id, validPayload);
  assert(r2.status === 'ALREADY_USED', 'second scan → ALREADY_USED');

  const r3 = await postValidate(scannerUser.id, badTokenPayload);
  assert(r3.status === 'INVALID', 'wrong token → INVALID');

  const r4 = await postValidate(scannerUser.id, malformed);
  assert(r4.status === 'INVALID', 'malformed → INVALID');

  const approvedToken = randomBytes(24).toString('hex');
  const approvedDiscount = await prisma.gastroDiscount.create({
    data: {
      tenantId: tenant.id,
      eventId: event.id,
      gastroProfileId: profile.id,
      code: 'SCAN-APPROVED-01',
      type: 'PERCENT',
      value: 10,
      status: 'APPROVED',
      displayTitle: 'Approved status test',
      discountDate: expiresToday,
      validTo: expiresToday,
      qrToken: randomBytes(24).toString('hex'),
    },
  });
  await prisma.gastroDiscountClaim.create({
    data: {
      tenantId: tenant.id,
      discountId: approvedDiscount.id,
      email: 'approved@gastro-scan.test',
      qrToken: approvedToken,
      accessToken: randomBytes(32).toString('hex'),
      shortCode: 'TSTAP1',
      expiresAt: expiresToday,
      status: 'ACTIVE',
    },
  });
  const rApproved = await postValidate(
    scannerUser.id,
    buildGastroDiscountQrPayload(approvedDiscount.id, approvedToken),
  );
  assert(rApproved.status === 'VALID', 'APPROVED parent + active claim → VALID');

  // Daily limit: patron redeems two coupons same day
  const discount2 = await prisma.gastroDiscount.upsert({
    where: { eventId_code: { eventId: event.id, code: 'SCAN-TEST-02' } },
    update: {
      status: 'ACTIVE',
      discountDate: expiresToday,
      validTo: expiresToday,
    },
    create: {
      tenantId: tenant.id,
      eventId: event.id,
      gastroProfileId: profile.id,
      code: 'SCAN-TEST-02',
      type: 'PERCENT',
      value: 15,
      status: 'ACTIVE',
      displayTitle: 'Daily limit B',
      discountDate: expiresToday,
      validTo: expiresToday,
      qrToken: randomBytes(24).toString('hex'),
    },
  });

  const tokenA = randomBytes(24).toString('hex');
  const tokenB = randomBytes(24).toString('hex');
  const claimA = await prisma.gastroDiscountClaim.upsert({
    where: {
      discountId_email: {
        discountId: discount.id,
        email: patronUser.email,
      },
    },
    update: { qrToken: tokenA, status: 'ACTIVE', usedAt: null, userId: patronUser.id },
    create: {
      tenantId: tenant.id,
      discountId: discount.id,
      email: patronUser.email,
      userId: patronUser.id,
      qrToken: tokenA,
      accessToken: randomBytes(32).toString('hex'),
      expiresAt: expiresToday,
      status: 'ACTIVE',
    },
  });
  const claimB = await prisma.gastroDiscountClaim.upsert({
    where: {
      discountId_email: {
        discountId: discount2.id,
        email: patronUser.email,
      },
    },
    update: { qrToken: tokenB, status: 'ACTIVE', usedAt: null, userId: patronUser.id },
    create: {
      tenantId: tenant.id,
      discountId: discount2.id,
      email: patronUser.email,
      userId: patronUser.id,
      qrToken: tokenB,
      accessToken: randomBytes(32).toString('hex'),
      expiresAt: expiresToday,
      status: 'ACTIVE',
    },
  });

  await prisma.gastroDiscountValidation.deleteMany({
    where: { claimId: { in: [claimA.id, claimB.id] } },
  });

  const payloadA = buildGastroDiscountQrPayload(discount.id, claimA.qrToken);
  const payloadB = buildGastroDiscountQrPayload(discount2.id, claimB.qrToken);

  const rDaily1 = await postValidate(scannerUser.id, payloadA);
  assert(rDaily1.status === 'VALID', 'first patron coupon today → VALID');

  const rDaily2 = await postValidate(scannerUser.id, payloadB);
  assert(rDaily2.status === 'VALID', 'second patron coupon same day → VALID');

  await prisma.gastroDiscount.update({
    where: { id: discount.id },
    data: { status: 'CANCELLED' },
  });
  const claim2Token = randomBytes(24).toString('hex');
  await prisma.gastroDiscountClaim.upsert({
    where: {
      discountId_email: {
        discountId: discount.id,
        email: 'guest2@gastro-scan.test',
      },
    },
    update: { qrToken: claim2Token },
    create: {
      tenantId: tenant.id,
      discountId: discount.id,
      email: 'guest2@gastro-scan.test',
      qrToken: claim2Token,
      accessToken: randomBytes(32).toString('hex'),
    },
  });
  const inactivePayload = buildGastroDiscountQrPayload(discount.id, claim2Token);
  const r5 = await postValidate(scannerUser.id, inactivePayload);
  assert(r5.status === 'INACTIVE', 'cancelled discount → INACTIVE');

  console.log('\nAll gastro discount scanner checks passed.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
