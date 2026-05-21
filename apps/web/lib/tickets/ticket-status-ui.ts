import { TICKET_STATUS_LABELS } from '@/lib/domainLabels';

export function isTicketEntryBlocked(status: string): boolean {
  return (
    status === 'USED' ||
    status === 'REVOKED' ||
    status === 'TRANSFERRED' ||
    status === 'TRANSFER_PENDING'
  );
}

export function ticketStatusOverlayLabel(status: string): string | null {
  if (status === 'VALID') return null;
  return TICKET_STATUS_LABELS[status] ?? status;
}
