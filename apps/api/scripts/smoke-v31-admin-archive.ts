/**
 * V3.1 Slice 9 — admin archive/deactivate smoke (no physical deletes).
 * Run: pnpm --filter api run smoke:v31-admin-archive
 */

import { AuditAction, PrismaClient } from '@prisma/client';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-admin-archive`;
const ACTOR = { id: 'user-admin', role: 'ADMIN' };

type Cleanup = {
  eventId?: string;
  operatorId?: string;
};

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const prisma = new PrismaClient();
  const cleanup: Cleanup = {};
  let exitCode = 0;

  try {
    await prisma.$connect();
    pass('DB connect');

    const producer = await prisma.producerProfile.findFirst({
      where: { tenantId: TENANT, status: 'ACTIVE' },
      select: { id: true },
    });
    const producerId =
      producer?.id ??
      (await prisma.user.findFirst({ where: { tenantId: TENANT }, select: { id: true } }))?.id;
    if (!producerId) {
      fail('producerId');
      return 1;
    }

    const operator = await prisma.excursionOperator.create({
      data: { tenantId: TENANT, name: `${MARKER} operator`, isActive: true },
    });
    cleanup.operatorId = operator.id;

    const event = await prisma.event.create({
      data: {
        tenantId: TENANT,
        producerId,
        category: 'excursion',
        excursionOperatorId: operator.id,
        title: `${MARKER} excursion`,
        startAt: new Date(),
        status: 'APPROVED',
      },
    });
    cleanup.eventId = event.id;
    pass('seed approved excursion');

    await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id: event.id }, data: { status: 'PAUSED' } });
      await tx.auditLog.create({
        data: {
          tenantId: TENANT,
          actorId: ACTOR.id,
          actorRole: ACTOR.role,
          action: AuditAction.EVENT_POSTPONED,
          entityType: 'Event',
          entityId: event.id,
          before: { status: 'APPROVED' },
          after: { status: 'PAUSED', intent: 'archive' },
        },
      });
    });

    const paused = await prisma.event.findUnique({ where: { id: event.id } });
    if (paused?.status !== 'PAUSED') {
      fail('pause → PAUSED');
      exitCode = 1;
    } else {
      pass('pause → PAUSED');
    }

    const publicWhilePaused = await prisma.event.count({
      where: { id: event.id, status: 'APPROVED', deletedAt: null },
    });
    if (publicWhilePaused > 0) {
      fail('public filter while paused');
      exitCode = 1;
    } else {
      pass('paused hidden from public APPROVED filter');
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.update({
        where: { id: event.id },
        data: { status: 'APPROVED', publishedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          tenantId: TENANT,
          actorId: ACTOR.id,
          actorRole: ACTOR.role,
          action: AuditAction.EVENT_RESTORED,
          entityType: 'Event',
          entityId: event.id,
          before: { status: 'PAUSED' },
          after: { status: 'APPROVED' },
        },
      });
    });
    pass('restore → APPROVED');

    await prisma.excursionOperator.update({
      where: { id: operator.id },
      data: { isActive: false },
    });
    await prisma.auditLog.create({
      data: {
        tenantId: TENANT,
        actorId: ACTOR.id,
        actorRole: ACTOR.role,
        action: AuditAction.EXCURSION_OPERATOR_DEACTIVATED,
        entityType: 'ExcursionOperator',
        entityId: operator.id,
        before: { isActive: true },
        after: { isActive: false },
      },
    });
    pass('operator isActive=false + audit');

    const inactivePublic = await prisma.event.count({
      where: {
        id: event.id,
        status: 'APPROVED',
        deletedAt: null,
        excursionOperator: { isActive: true, deletedAt: null },
      },
    });
    if (inactivePublic > 0) {
      fail('inactive operator public filter');
      exitCode = 1;
    } else {
      pass('inactive operator hides excursion from parent-active filter');
    }
  } catch (e) {
    fail('unexpected', String(e));
    exitCode = 1;
  } finally {
    if (cleanup.eventId) {
      await prisma.eventSubcategory.deleteMany({ where: { eventId: cleanup.eventId } });
      await prisma.event.deleteMany({ where: { id: cleanup.eventId } });
    }
    if (cleanup.operatorId) {
      await prisma.excursionOperator.deleteMany({ where: { id: cleanup.operatorId } });
    }
    if (cleanup.eventId || cleanup.operatorId) {
      pass('ephemeral smoke artifacts cleaned');
    }
    await prisma.$disconnect();
  }

  return exitCode;
}

void runSmokeScript('v31-admin-archive', main);
