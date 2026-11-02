import {
  BENEFIT_TRANSFER_ATTRIBUTION_LABEL,
  resolveDiscountTransferMaxCents,
  type BenefitSettlementDiscountCashLine,
  type BenefitSettlementTransferDto,
  type BenefitTransferAttribution,
  type BenefitVertical,
} from '@yo-te-invito/shared';

/**
 * G10.D5 — how a CASH transfer is shown in /admin/liquidaciones/:id (pure, no React).
 * EN: attribution comes from `gastroDiscountId` only; legacy rows are labeled, never inferred.
 * ES: la atribución sale solo de `gastroDiscountId`; las filas legacy se rotulan, nunca se infieren.
 */

export type TransferAttributionView = {
  badge: BenefitTransferAttribution | null;
  discountLabel: string;
  localLabel: string;
};

export function describeTransferAttribution(
  transfer: Pick<BenefitSettlementTransferDto, 'attribution' | 'discountTitle' | 'discountLocalName'>,
  vertical: BenefitVertical,
  settlementLocalName: string | null,
): TransferAttributionView {
  if (vertical !== 'GASTRO') return { badge: null, discountLabel: '—', localLabel: settlementLocalName ?? '—' };
  if (transfer.attribution === 'EXACT') {
    return {
      badge: 'EXACT',
      discountLabel: transfer.discountTitle ?? 'Descuento',
      localLabel: transfer.discountLocalName ?? settlementLocalName ?? '—',
    };
  }
  return {
    badge: 'SETTLEMENT_LEVEL',
    discountLabel: BENEFIT_TRANSFER_ATTRIBUTION_LABEL.SETTLEMENT_LEVEL,
    localLabel: settlementLocalName ?? '—',
  };
}

export type SettlementDiscountPayOption = BenefitSettlementDiscountCashLine & {
  maxCents: string;
  cappedBySettlement: boolean;
};

/** GASTRO register form: only discounts with CASH remaining; max also capped by the settlement outstanding. */
export function settlementDiscountPayOptions(
  lines: ReadonlyArray<BenefitSettlementDiscountCashLine>,
  settlementOutstandingCents: string,
): SettlementDiscountPayOption[] {
  return lines
    .filter((l) => BigInt(l.cashRemainingCents) > BigInt(0))
    .map((l) => {
      const max = resolveDiscountTransferMaxCents({
        discountCashDueCents: BigInt(l.cashDueCents),
        discountCashPaidCents: BigInt(l.cashPaidCents),
        settlementCashOutstandingCents: BigInt(settlementOutstandingCents),
      });
      return { ...l, maxCents: max.toString(), cappedBySettlement: max < BigInt(l.cashRemainingCents) };
    });
}
