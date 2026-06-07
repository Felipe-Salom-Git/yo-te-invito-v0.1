import type { AuditAction } from '@prisma/client';

const ACTION_LABELS: Record<string, string> = {
  EVENT_APPROVED: 'Evento aprobado',
  EVENT_REJECTED: 'Evento rechazado',
  EVENT_POSTPONED: 'Evento archivado / pausado',
  EVENT_CANCELLED: 'Evento cancelado',
  EVENT_RESTORED: 'Evento restaurado',
  GASTRO_PROFILE_SUSPENDED: 'Local gastro suspendido',
  GASTRO_PROFILE_ACTIVATED: 'Local gastro activado',
  RENTAL_LOCATION_DEACTIVATED: 'Local rental dado de baja',
  RENTAL_LOCATION_ACTIVATED: 'Local rental reactivado',
  EXCURSION_OPERATOR_DEACTIVATED: 'Operador excursión dado de baja',
  EXCURSION_OPERATOR_ACTIVATED: 'Operador excursión reactivado',
  TICKET_REVOKED: 'Ticket revocado',
  ORDER_EXPIRED: 'Orden expirada',
  TICKET_TRANSFERRED: 'Ticket transferido',
  RESALE_LISTED: 'Reventa publicada',
  RESALE_SOLD: 'Reventa vendida',
  PAYOUT_STATUS_CHANGED: 'Estado de payout actualizado',
  GASTRO_DISCOUNT_COMMISSION_NEGOTIATION: 'Negociación comisión descuento gastro',
  GASTRO_DISCOUNT_APPROVED: 'Descuento gastro aprobado',
  GASTRO_DISCOUNT_REJECTED: 'Descuento gastro rechazado',
  GASTRO_DISCOUNT_CANCELLED: 'Descuento gastro cancelado',
  GASTRO_DISCOUNT_ACTIVATED: 'Descuento gastro activado',
  GASTRO_DISCOUNT_QR_EMAIL_SENT: 'QR descuento gastro enviado',
  REVIEW_DISPUTE_IN_REVIEW: 'Disputa de reseña en revisión',
  REVIEW_DISPUTE_ACCEPTED: 'Disputa de reseña aceptada',
  REVIEW_DISPUTE_REJECTED: 'Disputa de reseña rechazada',
  REVIEW_DISPUTE_RESOLVED: 'Disputa de reseña resuelta',
  REVIEW_HIDDEN: 'Reseña ocultada',
  REVIEW_RESTORED: 'Reseña restaurada',
  REVIEW_REPLY_UPDATED: 'Réplica de reseña actualizada',
};

function pickReason(after: unknown): string | null {
  if (!after || typeof after !== 'object') return null;
  const reason = (after as { reason?: string }).reason;
  return typeof reason === 'string' && reason.trim() ? reason.trim() : null;
}

export function buildAuditLogSummary(
  action: AuditAction | string,
  entityType: string,
  before: unknown,
  after: unknown,
): string {
  const label = ACTION_LABELS[action] ?? action.replace(/_/g, ' ').toLowerCase();
  const reason = pickReason(after);
  if (reason) {
    const short = reason.length > 120 ? `${reason.slice(0, 117)}…` : reason;
    return `${label} — ${short}`;
  }
  const statusAfter =
    after && typeof after === 'object' && 'status' in (after as object)
      ? String((after as { status: unknown }).status)
      : null;
  const statusBefore =
    before && typeof before === 'object' && 'status' in (before as object)
      ? String((before as { status: unknown }).status)
      : null;
  if (statusBefore && statusAfter && statusBefore !== statusAfter) {
    return `${label} (${statusBefore} → ${statusAfter})`;
  }
  return `${label} · ${entityType}`;
}
