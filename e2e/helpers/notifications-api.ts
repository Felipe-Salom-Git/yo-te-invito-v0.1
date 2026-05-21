import { E2E_API_BASE_URL } from './env';
import { getApiToken } from './api-auth';

export async function seedDemoNotification(token: string) {
  const res = await fetch(`${E2E_API_BASE_URL}/admin/notifications/seed-demo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`seed-demo failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<{ id: string; title: string; readAt: string | null } | null>;
}

/** Returns false if migration missing or API error (E2E skips dependent tests). */
export async function trySeedDemoNotification(token: string): Promise<boolean> {
  try {
    await seedDemoNotification(token);
    return true;
  } catch {
    return false;
  }
}

export async function seedDemoNotificationAsAdmin() {
  const token = await getApiToken();
  if (!token) throw new Error('API login failed for seed-demo');
  return seedDemoNotification(token);
}

export async function getUnreadCount(token: string): Promise<number> {
  const res = await fetch(`${E2E_API_BASE_URL}/me/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return 0;
  const json = (await res.json()) as { unreadCount?: number };
  return json.unreadCount ?? 0;
}
