import type { ScanResponse } from '@yo-te-invito/shared';
import {
  isManualShortCodeInput,
  normalizeManualShortCode,
  resolveTicketQrPayloadByShortCode,
} from '@yo-te-invito/shared';
import {
  getTicketForEvent,
  getTicketsForEvent,
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
  rawInput: string,
): Promise<OfflineScanResult> {
  const meta = await getSnapshotMeta(eventId);
  if (!meta) {
    return { result: 'INVALID', offline: true };
  }

  const stale = isSnapshotStale(meta);
  let qrPayload = rawInput.trim();

  if (isManualShortCodeInput(qrPayload)) {
    const code = normalizeManualShortCode(qrPayload);
    const tickets = await getTicketsForEvent(eventId.trim());
    const resolved = resolveTicketQrPayloadByShortCode(
      code,
      tickets.map((t) => ({ id: t.ticketId, qrPayload: t.qrPayload })),
    );
    if (!resolved) {
      return { result: 'INVALID', offline: true, staleSnapshot: stale };
    }
    qrPayload = resolved;
  }

  const ticket = await getTicketForEvent(qrPayload, eventId.trim());

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

  await markTicketUsed(qrPayload);
  await addToScanQueue(qrPayload, eventId.trim(), getDeviceId());

  return {
    result: 'OK',
    ticketId: ticket.ticketId,
    ticketTypeName: ticket.ticketType,
    offline: true,
    pendingSync: true,
    staleSnapshot: stale,
  };
}
