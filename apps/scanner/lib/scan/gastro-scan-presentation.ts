import type { GastroDiscountScanStatus, ValidateGastroDiscountResponse } from '@yo-te-invito/shared';

export type GastroScanTone = 'ok' | 'warn' | 'error';

export type GastroScanPresentation = {
  tone: GastroScanTone;
  statusLabel: string;
  kindLabel: 'Cortesía' | 'Descuento' | null;
  headline: string;
  message: string;
  /** Benefit text. Courtesy never surfaces a literal 0%. */
  benefit: string | null;
  shortCode: string | null;
  localName: string | null;
};

const STATUS_LABEL: Record<GastroDiscountScanStatus, string> = {
  VALID: 'Válido',
  ALREADY_USED: 'Ya usado',
  EXPIRED: 'Vencido',
  INVALID: 'Inválido',
  INACTIVE: 'Inactivo',
  NOT_VALID_TODAY: 'No válido hoy',
  LIMIT_REACHED: 'Límite alcanzado',
};

function toneFor(status: GastroDiscountScanStatus): GastroScanTone {
  if (status === 'VALID') return 'ok';
  if (status === 'ALREADY_USED' || status === 'LIMIT_REACHED' || status === 'NOT_VALID_TODAY') {
    return 'warn';
  }
  return 'error';
}

/** Courtesy value copied from a 0% discount shell must not be shown. */
export function isZeroPercentBenefit(label: string | null | undefined): boolean {
  return /^0\s*%$/.test((label ?? '').trim());
}

/**
 * Scanner result copy. Uses the real scan statuses (there is no USED / CANCELLED /
 * WRONG_LOCATION code on this response).
 */
export function presentGastroDiscountScan(
  result: Pick<ValidateGastroDiscountResponse, 'status' | 'title' | 'message' | 'discount'>,
): GastroScanPresentation {
  const kind = result.discount?.kind;
  const rawBenefit = result.discount?.valueLabel?.trim() || '';
  const hideBenefit = !rawBenefit || (kind === 'COURTESY' && isZeroPercentBenefit(rawBenefit));
  return {
    tone: toneFor(result.status),
    statusLabel: STATUS_LABEL[result.status],
    kindLabel: kind === 'COURTESY' ? 'Cortesía' : result.discount ? 'Descuento' : null,
    headline: result.title,
    message: result.message,
    benefit: hideBenefit ? null : rawBenefit,
    shortCode: result.discount?.shortCode?.trim() || null,
    localName: result.discount?.localName?.trim() || null,
  };
}

export function gastroScanToneClass(tone: GastroScanTone): string {
  if (tone === 'ok') return 'bg-emerald-700 text-white';
  if (tone === 'warn') return 'bg-amber-700 text-white';
  return 'bg-red-700 text-white';
}
