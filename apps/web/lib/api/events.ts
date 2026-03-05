import type {
  EventSummary,
  EventsListQuery,
  EventsPaginatedResponse,
} from '@yo-te-invito/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function fetchEvents(
  query: EventsListQuery
): Promise<EventsPaginatedResponse> {
  const params = new URLSearchParams({
    tenantId: query.tenantId,
    page: String(query.page),
    limit: String(query.limit),
  });
  if (query.city) params.set('city', query.city);
  if (query.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query.dateTo) params.set('dateTo', query.dateTo);

  const res = await fetch(`${API_BASE}/public/events?${params}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export type { EventSummary, EventsListQuery, EventsPaginatedResponse };
