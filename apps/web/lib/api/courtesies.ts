import type {
  CreateCourtesyBody,
  CreateCourtesyResponse,
  CourtesyGrantSummary,
} from '@yo-te-invito/shared';
import type { TicketTypeResponse } from '@yo-te-invito/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getHeaders(devUserId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Dev-User-Id': devUserId,
  };
}

export async function createCourtesy(
  eventId: string,
  body: CreateCourtesyBody,
  devUserId: string,
): Promise<CreateCourtesyResponse> {
  const res = await fetch(`${API_BASE}/events/${eventId}/courtesies`, {
    method: 'POST',
    headers: getHeaders(devUserId),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? 'Failed to create courtesy');
  }
  return res.json();
}

export async function listCourtesies(
  eventId: string,
  devUserId: string,
): Promise<{ grants: CourtesyGrantSummary[] }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/courtesies`, {
    headers: getHeaders(devUserId),
  });
  if (!res.ok) throw new Error('Failed to fetch courtesies');
  return res.json();
}

export async function fetchTicketTypes(
  eventId: string,
  devUserId: string,
): Promise<TicketTypeResponse[]> {
  const res = await fetch(`${API_BASE}/events/${eventId}/ticket-types`, {
    headers: getHeaders(devUserId),
  });
  if (!res.ok) throw new Error('Failed to fetch ticket types');
  return res.json();
}
