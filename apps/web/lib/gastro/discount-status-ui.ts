import {
  isGastroDiscountExpired,
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
): GastroDiscountClaimStatus {
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'USED' || usedAt) return 'USED';
  if (status === 'EXPIRED') return 'EXPIRED';
  if (validTo && isGastroDiscountExpired(new Date(validTo))) return 'EXPIRED';
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
