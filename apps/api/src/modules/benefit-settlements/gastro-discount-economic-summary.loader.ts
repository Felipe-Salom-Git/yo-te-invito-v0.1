import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { userDisplayLabel } from '../../common/user-contact.util';

/**
 * G10.C2 — read-only loads for the per-discount economic summary (no writes, no new tables).
 * Trace: discount → validations → allocations (validationSource + validationId) → settlements;
 * transfers attributed by `gastroDiscountId`; credits by `sourceAllocationId`; agreement audits.
 */

export const ECONOMIC_SUMMARY_DISCOUNT_SELECT = {
  id: true,
  tenantId: true,
  gastroProfileId: true,
  displayTitle: true,
  status: true,
  visibility: true,
  courtesyCampaign: {
    select: { id: true, courtesyCreditDebit: { select: { id: true, type: true } } },
  },
} satisfies Prisma.GastroDiscountSelect;

export type EconomicSummaryDiscountRow = Prisma.GastroDiscountGetPayload<{
  select: typeof ECONOMIC_SUMMARY_DISCOUNT_SELECT;
}>;

const AGREEMENT_HISTORY_ACTIONS = [
  'BENEFIT_AGREEMENT_CREATED',
  'BENEFIT_AGREEMENT_CLOSED',
  'BENEFIT_AGREEMENT_REPLACED',
] as const;

export async function loadDiscountEconomicRows(
  prisma: PrismaService,
  tenantId: string,
  discountId: string,
) {
  const validations = await prisma.gastroDiscountValidation.findMany({
    where: { discountId, discount: { tenantId } },
    select: { id: true, claimId: true, validatedAt: true },
    orderBy: [{ validatedAt: 'asc' }, { id: 'asc' }],
  });
  const claimedIds = validations.filter((v) => v.claimId != null).map((v) => v.id);

  const [allocations, transfers] = await Promise.all([
    prisma.benefitSettlementUsageAllocation.findMany({
      where: {
        tenantId,
        validationSource: 'GASTRO_DISCOUNT_VALIDATION',
        validationId: { in: claimedIds },
      },
      select: {
        id: true,
        settlementId: true,
        validationId: true,
        mode: true,
        baseAmountCents: true,
        currency: true,
        allocatedAt: true,
        allocatedByUserId: true,
      },
      orderBy: [{ allocatedAt: 'asc' }, { id: 'asc' }],
    }),
    prisma.benefitSettlementTransfer.findMany({
      where: { tenantId, gastroDiscountId: discountId },
      orderBy: [{ transferredAt: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  const settlementIds = [
    ...new Set([...allocations.map((a) => a.settlementId), ...transfers.map((t) => t.settlementId)]),
  ];
  const settlements =
    settlementIds.length === 0
      ? []
      : await prisma.benefitSettlement.findMany({
          where: { tenantId, id: { in: settlementIds } },
          select: {
            id: true,
            periodKey: true,
            status: true,
            allocations: {
              select: { id: true, settlementId: true, validationId: true, mode: true, baseAmountCents: true },
            },
            transfers: {
              select: { id: true, gastroDiscountId: true, amountCents: true, reversedAt: true },
            },
          },
        });

  const barterIds = allocations.filter((a) => a.mode === 'BARTER').map((a) => a.id);
  const credits =
    barterIds.length === 0
      ? []
      : await prisma.courtesyCreditLedgerEntry.findMany({
          where: { tenantId, type: 'CREDIT_FROM_SETTLEMENT', sourceAllocationId: { in: barterIds } },
          select: { id: true, sourceAllocationId: true, amountCents: true, createdAt: true, createdByUserId: true },
        });

  return { validations, allocations, transfers, settlements, credits, barterIds };
}

export async function loadAgreementAudits(
  prisma: PrismaService,
  tenantId: string,
  agreementIds: string[],
) {
  if (agreementIds.length === 0) return [];
  const rows = await prisma.auditLog.findMany({
    where: {
      tenantId,
      entityType: 'BenefitCommercialAgreement',
      entityId: { in: agreementIds },
      action: { in: [...AGREEMENT_HISTORY_ACTIONS] },
    },
    select: { action: true, entityId: true, createdAt: true, actorId: true, after: true, metadata: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((row) => {
    const after = (row.after ?? {}) as { validTo?: string | null };
    const metadata = (row.metadata ?? {}) as { replacedAgreementId?: string };
    return {
      action: row.action as (typeof AGREEMENT_HISTORY_ACTIONS)[number],
      entityId: row.entityId,
      createdAt: row.createdAt,
      actorId: row.actorId,
      validTo: typeof after.validTo === 'string' ? after.validTo : null,
      replacedAgreementId: metadata.replacedAgreementId ?? null,
    };
  });
}

/** Display labels for ADMIN only (GASTRO never receives actors). */
export async function loadActorLabels(
  prisma: PrismaService,
  tenantId: string,
  userIds: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (ids.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { tenantId, id: { in: ids } },
    select: { id: true, email: true, username: true, firstName: true, lastName: true },
  });
  return new Map(users.map((u) => [u.id, userDisplayLabel(u)]));
}
