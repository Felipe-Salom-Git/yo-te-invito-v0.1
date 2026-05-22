import type { AuditActionValue } from '@yo-te-invito/shared';

/** Spanish labels for audit actions (operations UI). */
export const AUDIT_ACTION_LABELS: Record<AuditActionValue | string, string> = {
  EVENT_APPROVED: 'Evento aprobado',
  EVENT_REJECTED: 'Evento rechazado',
  EVENT_POSTPONED: 'Evento pospuesto',
  EVENT_CANCELLED: 'Evento cancelado',
  TICKET_REVOKED: 'Ticket revocado',
  ORDER_EXPIRED: 'Orden expirada',
  TICKET_TRANSFERRED: 'Ticket transferido',
  RESALE_LISTED: 'Reventa publicada',
  RESALE_SOLD: 'Reventa vendida',
  PAYOUT_STATUS_CHANGED: 'Payout actualizado',
  GASTRO_DISCOUNT_COMMISSION_NEGOTIATION: 'Comisión descuento gastro',
  GASTRO_DISCOUNT_APPROVED: 'Descuento gastro aprobado',
  GASTRO_DISCOUNT_REJECTED: 'Descuento gastro rechazado',
  GASTRO_DISCOUNT_CANCELLED: 'Descuento gastro cancelado',
  GASTRO_DISCOUNT_ACTIVATED: 'Descuento gastro activado',
  GASTRO_DISCOUNT_QR_EMAIL_SENT: 'QR descuento enviado',
  REVIEW_DISPUTE_IN_REVIEW: 'Disputa en revisión',
  REVIEW_DISPUTE_ACCEPTED: 'Disputa aceptada',
  REVIEW_DISPUTE_REJECTED: 'Disputa rechazada',
  REVIEW_DISPUTE_RESOLVED: 'Disputa resuelta',
  REVIEW_HIDDEN: 'Reseña ocultada',
  REVIEW_RESTORED: 'Reseña restaurada',
  REVIEW_REPLY_UPDATED: 'Réplica actualizada',
};

export const AUDIT_ACTION_OPTIONS: Array<{ value: AuditActionValue; label: string }> =
  (Object.keys(AUDIT_ACTION_LABELS) as AuditActionValue[]).map((value) => ({
    value,
    label: AUDIT_ACTION_LABELS[value] ?? value,
  }));

export const AUDIT_ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'Todas las entidades' },
  { value: 'Event', label: 'Evento' },
  { value: 'Review', label: 'Reseña' },
  { value: 'ReviewDisputeRequest', label: 'Disputa de reseña' },
  { value: 'Ticket', label: 'Ticket' },
  { value: 'Order', label: 'Orden' },
  { value: 'GastroDiscount', label: 'Descuento gastro' },
];

export function getAuditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/_/g, ' ');
}
