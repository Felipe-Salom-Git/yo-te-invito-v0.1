import type { ScanResponse } from '@yo-te-invito/shared';
import {
  getTicketForEvent,
  markTicketUsed,
  addToScanQueue,
  getSnapshotMeta,
  isSnapshotStale,
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

export type OfflineScanResult = ScanResponse & {
  offline?: boolean;
  pendingSync?: boolean;
  staleSnapshot?: boolean;
};

export async function scanOffline(
  eventId: string,
  qrPayload: string,
): Promise<OfflineScanResult> {
  const meta = await getSnapshotMeta(eventId);
  if (!meta) {
    return { result: 'INVALID', offline: true };
  }

  const stale = isSnapshotStale(meta);
  const ticket = await getTicketForEvent(qrPayload.trim(), eventId.trim());

  if (!ticket) {
    return {
      result: 'INVALID',
      offline: true,
      staleSnapshot: stale,
    };
  }

  if (ticket.status === 'USED') {
    return {
      result: 'ALREADY_USED',
      ticketId: ticket.ticketId,
      ticketTypeName: ticket.ticketType,
      offline: true,
      staleSnapshot: stale,
    };
  }

  if (ticket.status !== 'VALID') {
    return {
      result: ticket.status === 'REVOKED' ? 'REVOKED' : 'INVALID',
      ticketId: ticket.ticketId,
      offline: true,
      staleSnapshot: stale,
    };
  }

  await markTicketUsed(qrPayload.trim());
  await addToScanQueue(qrPayload.trim(), eventId.trim(), getDeviceId());

  return {
    result: 'OK',
    ticketId: ticket.ticketId,
    ticketTypeName: ticket.ticketType,
    offline: true,
    pendingSync: true,
    staleSnapshot: stale,
  };
}
