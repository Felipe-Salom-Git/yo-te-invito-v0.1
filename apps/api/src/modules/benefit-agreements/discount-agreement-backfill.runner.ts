import { Prisma, type PrismaClient } from '@prisma/client';
import {
  benefitAgreementCalendarKeyFromInstant,
  benefitAgreementRangesOverlap,
  moneyCentsToString,
} from '@yo-te-invito/shared';
import {
  planDiscountAgreementBackfill,
  type BackfillCopy,
  type BackfillDiscount,
  type BackfillPlan,
} from './discount-agreement-backfill.plan';

export const BACKFILL_ACTOR_ID = 'system:g10-discount-agreement-backfill';
export const BACKFILL_ACTOR_ROLE = 'SYSTEM';

export type BackfillRunResult = {
  mode: 'DRY_RUN' | 'CONFIRM';
  plan: BackfillPlan;
  inserted: Array<{ agreementId: string; legacyAgreementId: string; gastroDiscountId: string }>;
  skippedAtWrite: Array<{ legacyAgreementId: string; gastroDiscountId: string; reason: 'ALREADY_EXISTS' | 'OWN_AGREEMENTS' | 'OVERLAP' }>;
};

/** Loads the real state (read-only) and returns the backfill plan. */
export async function loadDiscountAgreementBackfillPlan(
  prisma: PrismaClient,
  opts: { tenantId?: string } = {},
): Promise<BackfillPlan> {
  const tenantWhere = opts.tenantId ? { tenantId: opts.tenantId } : {};
  const [legacyRows, discounts, discountAgreements, validations, allocations] = await Promise.all([
    prisma.benefitCommercialAgreement.findMany({
      where: { ...tenantWhere, vertical: 'GASTRO', gastroDiscountId: null, gastroProfileId: { not: null } },
      orderBy: [{ validFrom: 'asc' }, { id: 'asc' }],
    }),
    prisma.gastroDiscount.findMany({
      where: tenantWhere,
      select: {
        id: true,
        tenantId: true,
        gastroProfileId: true,
        status: true,
        visibility: true,
        archivedAt: true,
        createdAt: true,
        courtesyCampaign: { select: { courtesyCreditDebit: { select: { type: true } } } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }),
    prisma.benefitCommercialAgreement.findMany({
      where: { ...tenantWhere, vertical: 'GASTRO', gastroDiscountId: { not: null } },
      select: { id: true, gastroDiscountId: true, derivedFromAgreementId: true, validFrom: true, validTo: true },
    }),
    prisma.gastroDiscountValidation.findMany({
      where: { claimId: { not: null }, ...(opts.tenantId ? { discount: { tenantId: opts.tenantId } } : {}) },
      select: { id: true, discountId: true, validatedAt: true },
    }),
    prisma.benefitSettlementUsageAllocation.findMany({
      where: { ...tenantWhere, validationSource: 'GASTRO_DISCOUNT_VALIDATION' },
      select: { validationId: true },
    }),
  ]);

  const allocated = new Set(allocations.map((a) => a.validationId));
  const validationsByDiscount = new Map<string, { total: number; pending: Date[] }>();
  for (const v of validations) {
    const entry = validationsByDiscount.get(v.discountId) ?? { total: 0, pending: [] };
    entry.total += 1;
    if (!allocated.has(v.id)) entry.pending.push(v.validatedAt);
    validationsByDiscount.set(v.discountId, entry);
  }
  const agreementsByDiscount = new Map<string, BackfillDiscount['existingAgreements']>();
  for (const a of discountAgreements) {
    const list = agreementsByDiscount.get(a.gastroDiscountId!) ?? [];
    list.push({ id: a.id, derivedFromAgreementId: a.derivedFromAgreementId, validFrom: a.validFrom, validTo: a.validTo });
    agreementsByDiscount.set(a.gastroDiscountId!, list);
  }

  return planDiscountAgreementBackfill({
    legacy: legacyRows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      gastroProfileId: row.gastroProfileId!,
      unitPriceCents: row.unitPriceCents,
      barterMultiplier: row.barterMultiplier.toString(),
      currency: row.currency,
      validFrom: row.validFrom,
      validTo: row.validTo,
    })),
    discounts: discounts.map((d) => ({
      id: d.id,
      tenantId: d.tenantId,
      gastroProfileId: d.gastroProfileId,
      status: d.status,
      visibility: d.visibility,
      archivedAt: d.archivedAt,
      createdAt: d.createdAt,
      fundedCourtesy: d.courtesyCampaign?.courtesyCreditDebit?.type === 'DEBIT_COURTESY',
      validationCount: validationsByDiscount.get(d.id)?.total ?? 0,
      pendingValidatedAt: validationsByDiscount.get(d.id)?.pending ?? [],
      existingAgreements: agreementsByDiscount.get(d.id) ?? [],
    })),
  });
}

/**
 * Dry-run by default. `confirm` = insert-only, one Serializable transaction per profile, each
 * discount row locked and re-checked (idempotency + overlap) before writing. Never UPDATE/DELETE.
 */
export async function runDiscountAgreementBackfill(
  prisma: PrismaClient,
  opts: { confirm: boolean; tenantId?: string },
): Promise<BackfillRunResult> {
  const plan = await loadDiscountAgreementBackfillPlan(prisma, { tenantId: opts.tenantId });
  const result: BackfillRunResult = {
    mode: opts.confirm ? 'CONFIRM' : 'DRY_RUN',
    plan,
    inserted: [],
    skippedAtWrite: [],
  };
  if (!opts.confirm) return result;

  const byProfile = new Map<string, BackfillCopy[]>();
  for (const copy of plan.copies) {
    const list = byProfile.get(copy.gastroProfileId) ?? [];
    list.push(copy);
    byProfile.set(copy.gastroProfileId, list);
  }

  for (const copies of byProfile.values()) {
    const outcome = await prisma.$transaction(
      (tx) => writeProfileCopies(tx, copies),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    result.inserted.push(...outcome.inserted);
    result.skippedAtWrite.push(...outcome.skipped);
  }
  return result;
}

async function writeProfileCopies(tx: Prisma.TransactionClient, copies: BackfillCopy[]) {
  const inserted: BackfillRunResult['inserted'] = [];
  const skipped: BackfillRunResult['skippedAtWrite'] = [];
  const keyOf = (d: Date) => benefitAgreementCalendarKeyFromInstant(d);

  for (const copy of copies) {
    await tx.$executeRaw(
      Prisma.sql`SELECT id FROM "GastroDiscount" WHERE id = ${copy.gastroDiscountId} AND "tenantId" = ${copy.tenantId} FOR UPDATE`,
    );
    const existing = await tx.benefitCommercialAgreement.findMany({
      where: { tenantId: copy.tenantId, vertical: 'GASTRO', gastroDiscountId: copy.gastroDiscountId },
      select: { derivedFromAgreementId: true, validFrom: true, validTo: true },
    });
    const base = { legacyAgreementId: copy.legacyAgreementId, gastroDiscountId: copy.gastroDiscountId };
    if (existing.some((a) => a.derivedFromAgreementId === copy.legacyAgreementId)) {
      skipped.push({ ...base, reason: 'ALREADY_EXISTS' });
      continue;
    }
    if (existing.some((a) => a.derivedFromAgreementId == null)) {
      skipped.push({ ...base, reason: 'OWN_AGREEMENTS' });
      continue;
    }
    const fromKey = keyOf(copy.validFrom);
    const toKey = copy.validTo ? keyOf(copy.validTo) : null;
    if (
      existing.some((a) =>
        benefitAgreementRangesOverlap(keyOf(a.validFrom), a.validTo ? keyOf(a.validTo) : null, fromKey, toKey),
      )
    ) {
      skipped.push({ ...base, reason: 'OVERLAP' });
      continue;
    }
    const row = await tx.benefitCommercialAgreement.create({
      data: {
        tenantId: copy.tenantId,
        vertical: 'GASTRO',
        gastroProfileId: copy.gastroProfileId,
        gastroDiscountId: copy.gastroDiscountId,
        derivedFromAgreementId: copy.legacyAgreementId,
        unitPriceCents: copy.unitPriceCents,
        barterMultiplier: copy.barterMultiplier,
        currency: copy.currency,
        validFrom: copy.validFrom,
        validTo: copy.validTo,
        notes: `G10 backfill: copiado del acuerdo legacy del local ${copy.legacyAgreementId}${copy.clipped ? ' (vigencia recortada al alta del descuento)' : ''}`,
        createdByUserId: null,
      },
    });
    await tx.auditLog.create({
      data: {
        tenantId: copy.tenantId,
        actorId: BACKFILL_ACTOR_ID,
        actorRole: BACKFILL_ACTOR_ROLE,
        action: 'BENEFIT_AGREEMENT_CREATED',
        entityType: 'BenefitCommercialAgreement',
        entityId: row.id,
        after: {
          scope: 'DISCOUNT',
          gastroProfileId: copy.gastroProfileId,
          gastroDiscountId: copy.gastroDiscountId,
          unitPriceCents: moneyCentsToString(copy.unitPriceCents),
          barterMultiplier: copy.barterMultiplier,
          validFrom: fromKey,
          validTo: toKey,
        },
        metadata: { backfill: 'G10.A4', derivedFromAgreementId: copy.legacyAgreementId, clipped: copy.clipped },
      },
    });
    inserted.push({ agreementId: row.id, ...base });
  }
  return { inserted, skipped };
}
