const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface ReviewItem {
  id: string;
  score: number;
  title: string | null;
  comment: string | null;
  userName: string;
  createdAt: string;
}

export interface ReviewsResponse {
  reviews: ReviewItem[];
  page: number;
  total: number;
}

export async function fetchReviews(
  eventId: string,
  tenantId: string,
  page = 1,
  limit = 20
): Promise<ReviewsResponse> {
  const params = new URLSearchParams({
    tenantId,
    page: String(page),
    limit: String(limit),
  });
  const res = await fetch(
    `${API_BASE}/public/events/${eventId}/reviews?${params}`
  );
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function createReview(
  eventId: string,
  body: { score: number; title?: string; comment?: string },
  devUserId: string
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Dev-User-Id': devUserId,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? 'Failed to create review');
  }
  return res.json();
}
