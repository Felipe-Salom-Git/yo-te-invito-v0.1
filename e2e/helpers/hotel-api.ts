import { E2E_API_BASE_URL, E2E_TENANT_ID } from './env';
import { getApiToken } from './api-auth';

export type HotelMeProfile = {
  id: string;
  displayName: string;
  publicEventId?: string | null;
  description?: string | null;
};

export async function fetchHotelMe(
  email: string,
  password: string,
): Promise<{ profile: HotelMeProfile | null } | null> {
  const token = await getApiToken(email, password);
  if (!token) return null;

  const res = await fetch(`${E2E_API_BASE_URL}/hotel/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ profile: HotelMeProfile | null }>;
}

export async function fetchPublicHotelByEvent(
  eventId: string,
  tenantId = E2E_TENANT_ID,
): Promise<{ displayName: string } | null> {
  const res = await fetch(
    `${E2E_API_BASE_URL}/public/hotel-locations/by-event/${encodeURIComponent(eventId)}?tenantId=${encodeURIComponent(tenantId)}`,
  );
  if (!res.ok) return null;
  return res.json() as Promise<{ displayName: string }>;
}
