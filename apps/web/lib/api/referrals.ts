const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function lookupReferral(code: string): Promise<{
  eventId: string | null;
  tenantId?: string;
}> {
  const res = await fetch(`${API_BASE}/public/referral/${encodeURIComponent(code)}`);
  if (!res.ok) return { eventId: null };
  return res.json();
}

export interface CreateReferralLinkBody {
  code: string;
  referrerId?: string;
  label?: string;
}

export interface ReferralLinkSummary {
  id: string;
  code: string;
  label: string | null;
  attributedOrdersCount: number;
  createdAt: string;
}

export async function createReferralLink(
  eventId: string,
  body: CreateReferralLinkBody,
  devUserId: string,
): Promise<{ id: string; code: string; eventId: string; label: string | null; url: string }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/referral-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Dev-User-Id': devUserId,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? 'Failed to create referral link');
  }
  return res.json();
}

export async function listReferralLinks(
  eventId: string,
  devUserId: string,
): Promise<{ links: ReferralLinkSummary[] }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/referral-links`, {
    headers: { 'X-Dev-User-Id': devUserId },
  });
  if (!res.ok) throw new Error('Failed to fetch referral links');
  return res.json();
}
