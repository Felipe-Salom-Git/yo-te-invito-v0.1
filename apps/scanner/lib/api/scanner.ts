import type {
  OfflineSnapshotResponse,
  OfflineValidationSyncResponse,
  ScanResponse,
  ScannerAccountSelfResponse,
  ScannerScanTargetsResponse,
  ScannerEventOccurrencesResponse,
  ValidateGastroDiscountResponse,
} from '@yo-te-invito/shared';
import { getAuthHeaders } from '@/lib/auth/session';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:3001';

function jsonHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };
}

export interface OfflineTicket {
  ticketId: string;
  qrPayload: string;
  status: string;
}

export async function fetchScannerAccount(): Promise<ScannerAccountSelfResponse | null> {
  const res = await fetch(`${API_BASE}/scanner/account`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error('Failed to fetch scanner account');
  return res.json();
}

export async function fetchScanTargets(): Promise<ScannerScanTargetsResponse> {
  const res = await fetch(`${API_BASE}/scanner/scan-targets`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch scan targets');
  return res.json();
}

export async function fetchEventTickets(eventId: string): Promise<OfflineTicket[]> {
  const res = await fetch(`${API_BASE}/scanner/events/${encodeURIComponent(eventId)}/tickets`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch event tickets');
  const data = (await res.json()) as { tickets: OfflineTicket[] };
  return data.tickets ?? [];
}

export async function fetchEventSnapshot(eventId: string): Promise<OfflineSnapshotResponse> {
  const res = await fetch(`${API_BASE}/scanner/events/${encodeURIComponent(eventId)}/snapshot`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch event snapshot');
  return res.json();
}

export async function downloadEventTicketsPdf(
  eventId: string,
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(
    `${API_BASE}/scanner/events/${encodeURIComponent(eventId)}/tickets/export.pdf`,
    { headers: getAuthHeaders() },
  );
  if (!res.ok) {
    let message = 'Error al descargar PDF';
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? `entradas-${eventId}.pdf`;
  return { blob: await res.blob(), filename };
}

export interface ScanParams {
  eventId: string;
  qrPayload: string;
  deviceId?: string;
  occurrenceId?: string;
}

export type { ScannerEventOccurrence } from '@yo-te-invito/shared';

export async function fetchEventOccurrences(
  eventId: string,
): Promise<ScannerEventOccurrencesResponse> {
  const res = await fetch(
    `${API_BASE}/scanner/events/${encodeURIComponent(eventId)}/occurrences`,
    { headers: getAuthHeaders() },
  );
  if (res.status === 403 || res.status === 404) {
    throw new Error('Este evento ya no está disponible para escanear.');
  }
  if (!res.ok) throw new Error('No se pudo cargar las fechas del evento');
  return res.json();
}

export async function scanTicket(params: ScanParams): Promise<ScanResponse> {
  const res = await fetch(`${API_BASE}/scanner/scan`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      eventId: params.eventId,
      qrPayload: params.qrPayload,
      deviceId: params.deviceId,
      ...(params.occurrenceId ? { occurrenceId: params.occurrenceId } : {}),
    }),
  });
  if (!res.ok) throw new Error('Scan request failed');
  return res.json();
}

export async function syncOfflineValidations(body: {
  snapshotVersion: string;
  contentId: string;
  contentType: 'EVENT';
  validations: Array<{
    localId: string;
    qrPayload: string;
    scannedAt: string;
    deviceId?: string;
  }>;
}): Promise<OfflineValidationSyncResponse> {
  const res = await fetch(`${API_BASE}/scanner/offline-validations/sync`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Sync request failed');
  return res.json();
}

export async function validateGastroDiscount(params: {
  qrPayload: string;
  deviceId?: string;
}): Promise<ValidateGastroDiscountResponse> {
  const res = await fetch(`${API_BASE}/scanner/gastro-discounts/validate`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({
      qrPayload: params.qrPayload,
      deviceId: params.deviceId,
    }),
  });
  if (!res.ok) throw new Error('Gastro discount validate request failed');
  return res.json();
}
