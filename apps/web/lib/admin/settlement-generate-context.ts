import type { SettlementPartnerOption, SettlementPartnerVertical } from './settlement-partner-options';

/**
 * «Liquidar» shortcut from a gastro discount: preselects vertical + partner (GastroProfile).
 * The discount is navigation context only — settlements stay partner + period (no Settlement → Discount).
 * Atajo desde descuento: el descuento es solo contexto; la liquidación sigue siendo partner + período.
 */
export type SettlementGenerateContext = {
  open: boolean;
  vertical: SettlementPartnerVertical;
  partnerId: string;
  /** Vertical + partner fixed by the entry point (readonly selectors). */
  locked: boolean;
  fromDiscountId: string | null;
};

type SearchParamsLike = { get(name: string): string | null };

export function buildDiscountSettlementHref(input: {
  gastroProfileId: string;
  discountId: string;
}): string {
  const p = new URLSearchParams({
    generate: '1',
    vertical: 'GASTRO',
    partnerId: input.gastroProfileId,
    fromDiscountId: input.discountId,
  });
  return `/admin/liquidaciones?${p.toString()}`;
}

export function parseSettlementGenerateContext(params: SearchParamsLike): SettlementGenerateContext {
  const vertical: SettlementPartnerVertical =
    params.get('vertical') === 'ACTIVITY' ? 'ACTIVITY' : 'GASTRO';
  const partnerId = params.get('partnerId')?.trim() ?? '';
  const fromDiscountId = params.get('fromDiscountId')?.trim() || null;
  const locked = Boolean(fromDiscountId && vertical === 'GASTRO' && partnerId);
  return {
    open: params.get('generate') === '1',
    vertical,
    partnerId: locked ? partnerId : '',
    locked,
    fromDiscountId: locked ? fromDiscountId : null,
  };
}

/** Locked context exposes only its own partner (never another local). */
export function resolveGeneratePartnerOptions(
  options: SettlementPartnerOption[],
  context: Pick<SettlementGenerateContext, 'locked' | 'partnerId'>,
): SettlementPartnerOption[] {
  if (!context.locked) return options;
  const own = options.find((o) => o.id === context.partnerId);
  return [own ?? { id: context.partnerId, label: 'Local del descuento' }];
}

export type SettlementGenerateBody =
  | { vertical: 'GASTRO'; periodKey: string; gastroProfileId: string }
  | { vertical: 'ACTIVITY'; periodKey: string; excursionOperatorId: string };

export function buildSettlementGenerateBody(
  vertical: SettlementPartnerVertical,
  partnerId: string,
  periodKey: string,
): SettlementGenerateBody {
  return vertical === 'GASTRO'
    ? { vertical, periodKey, gastroProfileId: partnerId }
    : { vertical, periodKey, excursionOperatorId: partnerId };
}
