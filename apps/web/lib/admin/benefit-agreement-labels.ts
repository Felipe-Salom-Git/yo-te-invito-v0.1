import type { BenefitCommercialAgreementDto } from '@yo-te-invito/shared';

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
