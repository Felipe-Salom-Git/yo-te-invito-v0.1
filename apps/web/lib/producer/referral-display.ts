import type { ReferralCommissionStatus } from '@/repositories/interfaces';

export const REFERRAL_LEGAL_DISCLAIMER_REFERRER =
  'Yo Te Invito no administra ni garantiza pagos entre productoras y referidos. La plataforma solo registra el acuerdo, mide ventas atribuidas y facilita la comunicación. El pago debe ser acordado y realizado directamente entre las partes.';

export const REFERRAL_LEGAL_DISCLAIMER_PRODUCER =
  'Yo Te Invito no interviene ni garantiza los pagos entre productoras y referidos. La plataforma solo registra el acuerdo, mide ventas atribuidas y facilita la comunicación. Las condiciones y el pago son responsabilidad exclusiva de las partes.';

export const COMMISSION_RULES_PENDING_NOTICE =
  'Los montos de comisión generada son referencia según el acuerdo y las ventas atribuidas. No son saldo disponible ni dinero custodiado por Yo Te Invito. La liquidación es un pago externo entre productora y referido.';

export function proposalStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pendiente de respuesta';
    case 'ACCEPTED':
      return 'Aceptada';
    case 'REJECTED':
      return 'Rechazada';
    case 'CANCELLED':
      return 'Cancelada';
    case 'EXPIRED':
      return 'Vencida';
    default:
      return status;
  }
}

export function commissionTypeLabel(type: string): string {
  switch (type) {
    case 'PERCENTAGE':
      return 'Porcentaje';
    case 'FIXED_PER_TICKET':
      return 'Monto fijo por entrada';
    default:
      return type;
  }
}

export function formatCommissionValue(type: string, value: number): string {
  if (type === 'PERCENTAGE') return `${value}%`;
  return formatMoneyCents(value) + ' por entrada';
}

export function agreementStatusLabel(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return 'Activo';
    case 'PAUSED':
      return 'Pausado';
    case 'ENDED':
      return 'Finalizado';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return status;
  }
}

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

export function paymentRequestStatusLabel(status: string): string {
  switch (status) {
    case 'REQUESTED':
      return 'Solicitud enviada';
    case 'IN_REVIEW':
      return 'En revisión';
    case 'PAID':
      return 'Pago externo registrado';
    case 'REJECTED':
      return 'Rechazada';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status;
  }
}

export const REFERRAL_PAYMENT_REQUEST_DISCLAIMER_REFERRER =
  'Esta solicitud será enviada a la productora. Yo Te Invito no realiza ni garantiza pagos.';

export const REFERRAL_PAYMENT_REQUEST_DISCLAIMER_PRODUCER =
  'Al marcar como pagado, solo estás registrando que el pago fue realizado fuera de la plataforma.';

export function commissionStatusLabel(status: ReferralCommissionStatus | string): string {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'CONFIRMED':
      return 'Comisión generada';
    case 'CANCELLED':
      return 'Anulada';
    case 'MARKED_AS_PAID':
      return 'Pago externo registrado';
    case 'REQUESTED':
      return 'Solicitud enviada';
    case 'PAID':
      return 'Pago externo registrado';
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
