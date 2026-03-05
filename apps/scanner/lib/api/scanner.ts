import type { ScanResponse } from '@yo-te-invito/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export interface OfflineTicket {
  ticketId: string;
  qrPayload: string;
  status: string;
}

export async function fetchEventTickets(
  eventId: string,
  devUserId: string,
): Promise<OfflineTicket[]> {
  const res = await fetch(`${API_BASE}/scanner/events/${eventId}/tickets`, {
    headers: {
      'X-Dev-User-Id': devUserId,
    },
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
      'X-Dev-User-Id': params.devUserId,
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
