import type {
  EventSummary,
  EventsListQuery,
  EventsPaginatedResponse,
  EventsSearchQuery,
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

export async function fetchEventsSearch(
  query: EventsSearchQuery
): Promise<EventsPaginatedResponse> {
  const params = new URLSearchParams({
    tenantId: query.tenantId,
    page: String(query.page),
    limit: String(query.limit),
  });
  if (query.q) params.set('q', query.q);
  if (query.city) params.set('city', query.city);
  if (query.dateFrom) params.set('dateFrom', query.dateFrom);
  if (query.dateTo) params.set('dateTo', query.dateTo);
  if (query.minRating != null) params.set('minRating', String(query.minRating));

  const res = await fetch(`${API_BASE}/public/events/search?${params}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function fetchEventsTrending(
  tenantId: string,
  limit = 10
): Promise<EventSummary[]> {
  const params = new URLSearchParams({ tenantId, limit: String(limit) });
  const res = await fetch(`${API_BASE}/public/events/trending?${params}`);
  if (!res.ok) throw new Error('Failed to fetch trending');
  return res.json();
}

export async function fetchEventDetail(
  eventId: string,
  tenantId: string
): Promise<{
  id: string;
  title: string;
  startAt: string;
  city: string | null;
  venueName: string | null;
  coverImageUrl: string | null;
  description: string | null;
  endAt: string | null;
  venueAddress: string | null;
  geoLat: number | null;
  geoLng: number | null;
  capacityTotal: number | null;
  isTicketingEnabled: boolean;
  status: string;
  ratingAvg?: number | null;
  ratingCount?: number;
  media: Array<{ id: string; type: string; url: string; sortOrder: number }>;
}> {
  const res = await fetch(
    `${API_BASE}/public/events/${eventId}?tenantId=${encodeURIComponent(tenantId)}`
  );
  if (!res.ok) throw new Error('Event not found');
  return res.json();
}

export type {
  EventSummary,
  EventsListQuery,
  EventsPaginatedResponse,
  EventsSearchQuery,
};
