import {
  benefitAgreementCalendarKeyFromInstant,
  type GastroDiscountAgreementTerms,
} from '@yo-te-invito/shared';

/**
 * G10.B — form state for the commercial contract of ONE discount (create / replace).
 * Money is typed in whole pesos and sent as cents strings; dates are AR calendar keys.
 */
export type DiscountAgreementFormState = {
  unitPricePesos: string;
  barterMultiplier: string;
  validFrom: string;
  validTo: string;
  notes: string;
};

export function todayAgreementDateKey(): string {
  return benefitAgreementCalendarKeyFromInstant(new Date());
}

export function emptyDiscountAgreementForm(): DiscountAgreementFormState {
  return {
    unitPricePesos: '',
    barterMultiplier: '2',
    validFrom: todayAgreementDateKey(),
    validTo: '',
    notes: '',
  };
}

export function pesosToCentsString(pesos: string): string | null {
  const digits = pesos.replace(/\D/g, '');
  if (!digits || /^0+$/.test(digits)) return null;
  return (BigInt(digits) * BigInt(100)).toString();
}

export function centsToPesosInput(cents: string): string {
  return (BigInt(cents) / BigInt(100)).toString();
}

const MULTIPLIER_PATTERN = /^\d+(\.\d{1,4})?$/;

export type DiscountAgreementTermsResult =
  | { ok: true; terms: GastroDiscountAgreementTerms }
  | { ok: false; error: string };

/** Client-side guard only; the API re-validates with Zod and decides vigency. */
export function buildDiscountAgreementTerms(
  state: DiscountAgreementFormState,
): DiscountAgreementTermsResult {
  const unitPriceCents = pesosToCentsString(state.unitPricePesos);
  if (!unitPriceCents) return { ok: false, error: 'Ingresá un valor por validación mayor a 0.' };
  const barterMultiplier = state.barterMultiplier.trim();
  if (!MULTIPLIER_PATTERN.test(barterMultiplier) || Number(barterMultiplier) <= 0) {
    return { ok: false, error: 'El multiplicador de canje debe ser un número positivo (ej. 2 o 1.5).' };
  }
  if (!state.validFrom) return { ok: false, error: 'Indicá desde cuándo rige el contrato.' };
  if (state.validTo && state.validTo < state.validFrom) {
    return { ok: false, error: 'La fecha "hasta" no puede ser anterior a "desde".' };
  }
  return {
    ok: true,
    terms: {
      unitPriceCents,
      barterMultiplier,
      currency: 'ARS',
      validFrom: state.validFrom,
      ...(state.validTo ? { validTo: state.validTo } : {}),
      ...(state.notes.trim() ? { notes: state.notes.trim() } : {}),
    },
  };
}
