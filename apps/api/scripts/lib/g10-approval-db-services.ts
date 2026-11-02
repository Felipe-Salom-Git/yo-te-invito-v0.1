/**
 * G10.B — real AdminGastroService + activation gate over PostgreSQL (external side effects stubbed).
 * Reuses the isolated G10 tenant seed (`withG10Db`).
 */

import { AdminGastroService } from '../../src/modules/admin/admin-gastro.service';
import { GastroDiscountAgreementGateService } from '../../src/modules/benefit-agreements/gastro-discount-agreement-gate.service';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { buildG10Services, createG10Discount, type G10Seed } from './g10-agreements-db-seed';

export function buildG10ApprovalServices(
  prisma: PrismaService,
  opts: { gate?: GastroDiscountAgreementGateService } = {},
) {
  const base = buildG10Services(prisma);
  const gate = opts.gate ?? new GastroDiscountAgreementGateService(prisma, base.audit, base.agreements);
  const approvedNotifications: Array<{ discountId: string; agreementId: string | null }> = [];
  const admin = new AdminGastroService(
    prisma,
    { isConfigured: () => false, send: async () => false } as never,
    { notifyFollowersOfNewActiveDiscount: async () => undefined } as never,
    {
      notifyDiscountApproved: (
        _t: string,
        discountId: string,
        _title: string,
        _aspect: string,
        o?: { agreement?: { id: string } | null },
      ) => approvedNotifications.push({ discountId, agreementId: o?.agreement?.id ?? null }),
      notifyDiscountRejected: () => undefined,
      notifyDiscountPending: () => undefined,
    } as never,
    gate,
    {
      deliverCampaign: async () => ({ sent: 0, failed: 0, emailConfigured: false, failures: [] }),
    } as never,
  );
  return { ...base, gate, admin, approvedNotifications };
}

/** A pending PUBLIC discount ready for approval (images saved), on a local with a public event. */
export async function createPendingG10Discount(
  prisma: PrismaService,
  seed: G10Seed,
  opts: { profileId: string; eventId: string; courtesy?: boolean },
) {
  const created = await createG10Discount(prisma, seed, { ...opts, status: 'PENDING_REVIEW' });
  await prisma.gastroDiscount.update({
    where: { id: created.discountId },
    data: {
      displayImageUrls: ['https://example.com/g10.jpg'],
      validTo: new Date('2027-12-31T23:59:59.000Z'),
      ...(opts.courtesy ? { qrToken: null } : {}),
    },
  });
  return created;
}

export async function linkG10PublicEvents(prisma: PrismaService, seed: G10Seed) {
  await prisma.gastroProfile.update({ where: { id: seed.profileA }, data: { publicEventId: seed.eventA } });
  await prisma.gastroProfile.update({ where: { id: seed.profileB }, data: { publicEventId: seed.eventB } });
}
