import {
  computeCashOutstandingCents,
  computeDiscountCashDueCents,
  computeDiscountCashPaidCents,
  moneyCentsToString,
  type BenefitSettlementDiscountCashLine,
} from '@yo-te-invito/shared';
import type { PrismaService } from '../../prisma/prisma.service';

/**
 * G10.D5 — per-discount CASH of ONE GASTRO settlement (read-only):
 * due = CASH allocations whose validation belongs to the discount; paid = its active attributed transfers.
 */
export async function loadSettlementDiscountCash(
  prisma: PrismaService,
  tenantId: string,
  settlement: {
    allocations: ReadonlyArray<{ mode: string; baseAmountCents: bigint; validationId: string }>;
    transfers: ReadonlyArray<{ amountCents: bigint; reversedAt: Date | null; gastroDiscountId: string | null }>;
  },
): Promise<{ lines: BenefitSettlementDiscountCashLine[]; discounts: Map<string, { title: string; localName: string | null }> }> {
  const cashValidationIds = settlement.allocations.filter((a) => a.mode === 'CASH').map((a) => a.validationId);
  const validations = cashValidationIds.length
    ? await prisma.gastroDiscountValidation.findMany({
        where: { id: { in: cashValidationIds } },
        select: { id: true, discountId: true },
      })
    : [];
  const discountIds = [
    ...new Set([
      ...validations.map((v) => v.discountId),
      ...settlement.transfers.flatMap((t) => (t.gastroDiscountId ? [t.gastroDiscountId] : [])),
    ]),
  ];
  const rows = discountIds.length
    ? await prisma.gastroDiscount.findMany({
        where: { id: { in: discountIds }, tenantId },
        select: { id: true, displayTitle: true, code: true, gastroProfile: { select: { displayName: true } } },
      })
    : [];
  const discounts = new Map(
    rows.map((d) => [d.id, { title: d.displayTitle ?? d.code, localName: d.gastroProfile?.displayName ?? null }] as const),
  );

  const lines = discountIds
    .filter((id) => discounts.has(id))
    .map((id) => {
      const owned = new Set(validations.filter((v) => v.discountId === id).map((v) => v.id));
      const due = computeDiscountCashDueCents(settlement.allocations, owned);
      const paid = computeDiscountCashPaidCents(settlement.transfers, id);
      return {
        gastroDiscountId: id,
        discountTitle: discounts.get(id)!.title,
        cashDueCents: moneyCentsToString(due),
        cashPaidCents: moneyCentsToString(paid),
        cashRemainingCents: moneyCentsToString(computeCashOutstandingCents(due, paid)),
      };
    })
    .sort((a, b) => a.discountTitle.localeCompare(b.discountTitle));
  return { lines, discounts };
}
