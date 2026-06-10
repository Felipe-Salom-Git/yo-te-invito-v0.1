import { TICKET_DATE_CHANGE_BLOCK_REASON } from '@yo-te-invito/shared';

export const TICKET_DATE_CHANGE_REASON_LABELS: Record<string, string> = {
  [TICKET_DATE_CHANGE_BLOCK_REASON.TICKET_NOT_FOUND]: 'Entrada no encontrada.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.NOT_OWNER]: 'No sos el titular de esta entrada.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.TICKET_USED]: 'Esta entrada ya fue usada.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.TICKET_REVOKED]: 'Esta entrada fue revocada.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.TICKET_EXPIRED]: 'La fecha de esta entrada ya pasó.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.TRANSFER_PENDING]:
    'Esta entrada tiene una transferencia pendiente.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.SINGLE_DATE_EVENT]:
    'Este evento no tiene múltiples fechas.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.NO_OCCURRENCE]: 'No hay fecha asociada a esta entrada.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.SAME_OCCURRENCE]: 'Elegí una fecha distinta a la actual.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.OCCURRENCE_NOT_FOUND]: 'La fecha seleccionada no es válida.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.OCCURRENCE_INACTIVE]: 'La fecha seleccionada no está disponible.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.OCCURRENCE_SOLD_OUT]: 'No hay stock en esa fecha.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.NO_COMPATIBLE_TICKET_TYPE]:
    'No hay un tipo de entrada compatible en esa fecha.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.PRICE_MISMATCH]:
    'Hay diferencia de precio; la productora debe revisar la solicitud.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.OUTSIDE_TIME_WINDOW]:
    'El cambio debe solicitarse al menos 24 horas antes del evento.',
  [TICKET_DATE_CHANGE_BLOCK_REASON.PENDING_REQUEST_EXISTS]:
    'Ya tenés una solicitud de cambio pendiente.',
};

export const TICKET_DATE_CHANGE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente de aprobación',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  APPLIED: 'Aplicada',
  CANCELLED: 'Cancelada',
};

export function labelDateChangeReason(code: string): string {
  return TICKET_DATE_CHANGE_REASON_LABELS[code] ?? 'No podés cambiar la fecha en este momento.';
}
