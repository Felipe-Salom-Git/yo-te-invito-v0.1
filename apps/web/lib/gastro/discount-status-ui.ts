import {
  isGastroDiscountExpired,
  isGastroDiscountNotYetActive,
  type GastroDiscountClaimStatus,
} from '@yo-te-invito/shared';

export const GASTRO_DISCOUNT_STATUS_LABELS: Record<GastroDiscountClaimStatus, string> = {
  ACTIVE: 'Disponible',
  USED: 'Usado',
  EXPIRED: 'Vencido',
  CANCELLED: 'Cancelado',
};

export const GASTRO_DISCOUNT_STATUS_STYLES: Record<GastroDiscountClaimStatus, string> = {
  ACTIVE: 'bg-accent/20 text-accent',
  USED: 'bg-border text-text-muted',
  EXPIRED: 'bg-border text-text-muted',
  CANCELLED: 'bg-red-500/15 text-red-300',
};

export const GASTRO_DISCOUNT_TYPE_LABELS = {
  PUBLIC_REQUEST: 'Solicitado',
  COURTESY: 'Cortesía',
} as const;

export function isGastroDiscountQrBlocked(status: GastroDiscountClaimStatus): boolean {
  return status !== 'ACTIVE';
}

export function resolveGastroDiscountDisplayStatus(
  status: GastroDiscountClaimStatus,
  validTo: string | null | undefined,
  usedAt?: string | null,
  validFrom?: string | null,
): GastroDiscountClaimStatus {
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'USED' || usedAt) return 'USED';
  if (status === 'EXPIRED') return 'EXPIRED';
  if (validTo && isGastroDiscountExpired(new Date(validTo))) return 'EXPIRED';
  if (validFrom && isGastroDiscountNotYetActive(new Date(validFrom))) return 'ACTIVE';
  return 'ACTIVE';
}

export function formatGastroDiscountValidTo(
  validTo: string | null | undefined,
): string | null {
  if (!validTo) return null;
  const d = new Date(validTo);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatGastroDiscountValidFrom(
  validFrom: string | null | undefined,
): string | null {
  return formatGastroDiscountValidTo(validFrom);
}

export function formatGastroDiscountValidityRangeLabel(
  validFrom?: string | null,
  validTo?: string | null,
  discountDate?: string | null,
): string | null {
  const from =
    formatGastroDiscountValidFrom(validFrom) ??
    (discountDate && !validFrom ? formatGastroDiscountValidTo(discountDate) : null);
  const to = formatGastroDiscountValidTo(validTo) ?? formatGastroDiscountValidTo(discountDate);
  if (!from && !to) return null;
  if (from && to && from !== to) return `Del ${from} al ${to}`;
  return from ?? to;
}
