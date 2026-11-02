import type { BenefitAgreementScope, BenefitCommercialAgreementDto } from '@yo-te-invito/shared';

export const BENEFIT_VERTICAL_LABEL: Record<BenefitCommercialAgreementDto['vertical'], string> = {
  GASTRO: 'Gastronómico',
  ACTIVITY: 'Excursión / Activity',
};

export const BENEFIT_AGREEMENT_VIGENCY_LABEL: Record<
  BenefitCommercialAgreementDto['vigency'],
  string
> = {
  CURRENT: 'Vigente',
  PAST: 'Histórico',
  FUTURE: 'Futuro',
};

/** G10.B — derived scope, as shown to ADMIN. */
export const BENEFIT_AGREEMENT_SCOPE_LABEL: Record<BenefitAgreementScope, string> = {
  DISCOUNT: 'Contrato del descuento',
  PROFILE_LEGACY: 'Contrato del local (legacy)',
  OPERATOR: 'Contrato del operador',
};

/** Who/what created the row (backfill copies keep lineage to the legacy local row). */
export function benefitAgreementOriginLabel(
  agreement: Pick<BenefitCommercialAgreementDto, 'scope' | 'derivedFromAgreementId'>,
): string {
  if (agreement.scope === 'PROFILE_LEGACY') return 'Contrato del local previo a G10 (solo lectura)';
  if (agreement.derivedFromAgreementId) return 'Copiado del contrato del local (migración)';
  return 'Cargado por administración';
}
