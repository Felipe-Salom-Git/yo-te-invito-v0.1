import type {
  ScanResponse,
  ScannerAccountSelfResponse,
  ScannerScanTargetsResponse,
  ValidateGastroDiscountResponse,
} from '@yo-te-invito/shared';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  'http://localhost:3001';

function authHeaders(devUserId: string): HeadersInit {
  return { 'X-Dev-User-Id': devUserId };
}

export interface OfflineTicket {
  ticketId: string;
  qrPayload: string;
  status: string;
}

export async function fetchScannerAccount(
  devUserId: string,
): Promise<ScannerAccountSelfResponse | null> {
  const res = await fetch(`${API_BASE}/scanner/account`, {
    headers: authHeaders(devUserId),
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new Error('Failed to fetch scanner account');
  return res.json();
}

export async function fetchScanTargets(devUserId: string): Promise<ScannerScanTargetsResponse> {
  const res = await fetch(`${API_BASE}/scanner/scan-targets`, {
    headers: authHeaders(devUserId),
  });
  if (!res.ok) throw new Error('Failed to fetch scan targets');
  return res.json();
}

export async function fetchEventTickets(
  eventId: string,
  devUserId: string,
): Promise<OfflineTicket[]> {
  const res = await fetch(`${API_BASE}/scanner/events/${encodeURIComponent(eventId)}/tickets`, {
    headers: authHeaders(devUserId),
  });
  if (!res.ok) throw new Error('Failed to fetch event tickets');
  const data = (await res.json()) as { tickets: OfflineTicket[] };
  return data.tickets ?? [];
}

export interface ScanParams {
  eventId: string;
  qrPayload: string;
  deviceId?: string;
  devUserId: string;
}

export async function scanTicket(params: ScanParams): Promise<ScanResponse> {
  const res = await fetch(`${API_BASE}/scanner/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(params.devUserId),
    },
    body: JSON.stringify({
      eventId: params.eventId,
      qrPayload: params.qrPayload,
      deviceId: params.deviceId,
    }),
  });
  if (!res.ok) throw new Error('Scan request failed');
  return res.json();
}

export async function validateGastroDiscount(params: {
  qrPayload: string;
  deviceId?: string;
  devUserId: string;
}): Promise<ValidateGastroDiscountResponse> {
  const res = await fetch(`${API_BASE}/scanner/gastro-discounts/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(params.devUserId),
    },
    body: JSON.stringify({
      qrPayload: params.qrPayload,
      deviceId: params.deviceId,
    }),
  });
  if (!res.ok) throw new Error('Gastro discount validate request failed');
  return res.json();
}
