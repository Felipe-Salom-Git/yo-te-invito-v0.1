import type { BenefitAgreementScope, BenefitCommercialAgreementDto } from '@yo-te-invito/shared';

/**
 * G10.B — /admin/liquidaciones/acuerdos: agreements listed (and created) per DISCOUNT for GASTRO.
 * Legacy profile-scoped rows stay visible but read-only; ACTIVITY keeps the operator flow.
 */
export type AgreementListFilters = {
  vertical: '' | 'GASTRO' | 'ACTIVITY';
  partnerId: string;
  gastroDiscountId: string;
  vigency: 'ALL' | 'CURRENT' | 'PAST' | 'FUTURE';
  scope: '' | BenefitAgreementScope;
};

export const GASTRO_DISCOUNT_STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: 'Pendiente',
  COMMISSION_NEGOTIATION: 'En coordinación',
  APPROVED: 'Aprobado',
  ACTIVE: 'Activo',
  REJECTED: 'Rechazado',
  CANCELLED: 'Cancelado',
  EXPIRED: 'Vencido',
};

export function isAgreementRowReadOnly(row: Pick<BenefitCommercialAgreementDto, 'scope'>): boolean {
  return row.scope === 'PROFILE_LEGACY';
}

/** API query: the partner filter maps to the right column per vertical; legacy `partnerId` URLs keep working. */
export function buildAgreementsListQuery(filters: AgreementListFilters) {
  const gastro = filters.vertical === 'GASTRO';
  return {
    ...(filters.vertical ? { vertical: filters.vertical } : {}),
    ...(filters.vigency !== 'ALL' ? { vigency: filters.vigency } : {}),
    ...(filters.scope ? { scope: filters.scope } : {}),
    ...(filters.partnerId && gastro ? { gastroProfileId: filters.partnerId } : {}),
    ...(filters.partnerId && filters.vertical === 'ACTIVITY' ? { excursionOperatorId: filters.partnerId } : {}),
    ...(gastro && filters.gastroDiscountId ? { gastroDiscountId: filters.gastroDiscountId } : {}),
  };
}

/** D-G10-10: a GASTRO contract always needs Local + Descuento; never a profile-scoped row. */
export function resolveGastroAgreementCreateTarget(
  vertical: 'GASTRO' | 'ACTIVITY',
  partnerId: string,
  gastroDiscountId: string,
): { gastroProfileId: string; gastroDiscountId: string } | { excursionOperatorId: string } | null {
  if (!partnerId) return null;
  if (vertical === 'ACTIVITY') return { excursionOperatorId: partnerId };
  if (!gastroDiscountId) return null;
  return { gastroProfileId: partnerId, gastroDiscountId };
}

export function discountAgreementManageHref(
  row: Pick<BenefitCommercialAgreementDto, 'gastroProfileId' | 'gastroDiscountId'>,
): string | null {
  if (!row.gastroProfileId || !row.gastroDiscountId) return null;
  return `/admin/gastronomicos/${encodeURIComponent(row.gastroProfileId)}/descuentos/${encodeURIComponent(row.gastroDiscountId)}#contrato-comercial`;
}

export function discountOptionLabel(d: { title: string | null; status: string; visibility?: string }): string {
  const kind = d.visibility === 'COURTESY_ONLY' ? 'Cortesía · ' : '';
  return `${kind}${d.title?.trim() || 'Sin título'} (${GASTRO_DISCOUNT_STATUS_LABEL[d.status] ?? d.status})`;
}
