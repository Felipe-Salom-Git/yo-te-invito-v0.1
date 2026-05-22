import type { ReferralCommissionStatus } from '@/repositories/interfaces';

export const COMMISSION_RULES_PENDING_NOTICE =
  'Las reglas definitivas de comisión todavía pueden configurarse según la operación de la productora. Los montos que ves aquí provienen de solicitudes registradas en el sistema, no de un cálculo automático de comisión.';

export function relationshipStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'ACTIVE':
      return 'Activa';
    case 'REJECTED':
      return 'Rechazada';
    case 'BLOCKED':
      return 'Bloqueada';
    default:
      return status;
  }
}

export function eventAssignmentStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Activa';
    case 'PAUSED':
      return 'Pausada';
    case 'CANCELED':
      return 'Cancelada';
    default:
      return status;
  }
}

export function commissionStatusLabel(status: ReferralCommissionStatus | string): string {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'REQUESTED':
      return 'Solicitada';
    case 'PAID':
      return 'Pagada';
    case 'REJECTED':
      return 'Rechazada';
    default:
      return status;
  }
}

export function formatMoneyCents(cents: number): string {
  return (cents / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}

/** Checkout URL aligned with API `referralCheckoutUrl` (client-side; includes tenant when known). */
export function buildReferralCheckoutUrl(
  eventId: string,
  code: string,
  tenantId?: string | null,
): string {
  if (typeof window === 'undefined') {
    const q = new URLSearchParams();
    if (tenantId) q.set('tenantId', tenantId);
    q.set('ref', code);
    return `/checkout/${encodeURIComponent(eventId)}?${q.toString()}`;
  }
  const q = new URLSearchParams();
  if (tenantId) q.set('tenantId', tenantId);
  q.set('ref', code);
  return `${window.location.origin}/checkout/${encodeURIComponent(eventId)}?${q.toString()}`;
}

export function buildReferralShortUrl(code: string): string {
  if (typeof window === 'undefined') return `/r/${encodeURIComponent(code)}`;
  return `${window.location.origin}/r/${encodeURIComponent(code)}`;
}
