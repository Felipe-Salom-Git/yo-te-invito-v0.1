import { E2E_API_BASE_URL, E2E_USER_EMAIL, E2E_USER_PASSWORD } from './env';

export async function getApiToken(
  email = E2E_USER_EMAIL,
  password = E2E_USER_PASSWORD,
): Promise<string | null> {
  if (!email || !password) return null;
  const res = await fetch(`${E2E_API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      tenantId: process.env.E2E_TENANT_ID ?? 'tenant-demo',
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { token?: string };
  return json.token ?? null;
}
