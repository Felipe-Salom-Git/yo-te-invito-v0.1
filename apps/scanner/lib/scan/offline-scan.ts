import type { ScanResponse } from '@yo-te-invito/shared';
import {
  getTicketForEvent,
  markTicketUsed,
  addToScanQueue,
} from '@/lib/db/offline-scanner';

const DEVICE_ID_KEY = 'scanner:deviceId';

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export async function scanOffline(
  eventId: string,
  qrPayload: string,
): Promise<ScanResponse> {
  const ticket = await getTicketForEvent(qrPayload.trim(), eventId.trim());

  if (!ticket) {
    return { result: 'INVALID' };
  }

  if (ticket.status === 'USED') {
    return { result: 'ALREADY_USED', ticketId: ticket.ticketId };
  }

  if (ticket.status !== 'VALID') {
    return { result: 'INVALID' };
  }

  await markTicketUsed(qrPayload.trim());
  await addToScanQueue(qrPayload.trim(), eventId.trim(), getDeviceId());

  return {
    result: 'OK',
    ticketId: ticket.ticketId,
  };
}
