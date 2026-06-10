import { ErrorCode } from '@yo-te-invito/shared';
import { ApiClientError } from '@/lib/api/client';

const TRANSFER_ERROR_MESSAGES: Record<string, string> = {
  [ErrorCode.NOT_TICKET_OWNER]: 'Esta entrada no te pertenece.',
  [ErrorCode.TICKET_ALREADY_USED]: 'Esta entrada ya fue usada.',
  [ErrorCode.TICKET_REVOKED]: 'Esta entrada fue revocada.',
  [ErrorCode.TICKET_EXPIRED]: 'Esta entrada o el evento ya venció.',
  [ErrorCode.TRANSFER_ALREADY_PENDING]: 'Ya tenés una transferencia pendiente.',
  [ErrorCode.TICKET_NOT_TRANSFERABLE]: 'Esta entrada no se puede transferir.',
  [ErrorCode.NOT_FOUND]: 'No hay un usuario registrado con ese email.',
};

export function getTransferErrorMessage(err: unknown): string | null {
  const body =
    err instanceof ApiClientError && err.body && typeof err.body === 'object'
      ? (err.body as Record<string, unknown>)
      : null;
  const code = body?.code;
  if (typeof code === 'string' && TRANSFER_ERROR_MESSAGES[code]) {
    return TRANSFER_ERROR_MESSAGES[code];
  }
  return null;
}

export function transferOfferStatusLabel(
  status: string,
  rejectedAt?: string | null,
): string {
  if (status === 'CANCELLED' && rejectedAt) {
    return 'Rechazada';
  }
  const labels: Record<string, string> = {
    AVAILABLE: 'Pendiente',
    RESERVED: 'Reservada',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    EXPIRED: 'Expirada',
  };
  return labels[status] ?? status;
}
