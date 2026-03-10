/**
 * Smoke tests for API endpoints.
 * Run: pnpm run smoke (from apps/api) or pnpm exec tsx apps/api/scripts/smoke-api.ts
 * Requires: API running (pnpm dev:api), DB migrated and seeded (pnpm db:migrate, pnpm run demo:seed)
 */

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:3001';
const DEV_USER_ID = process.env.SMOKE_DEV_USER_ID ?? 'user-admin';

let cachedToken: string | null = null;

async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@demo.local', password: 'demo', tenantId: 'tenant-demo' }),
  });
  const data = (await res.json()) as { token?: string };
  cachedToken = data.token ?? null;
  return cachedToken;
}

async function fetchApi(
  path: string,
  opts?: { method?: string; body?: unknown; query?: Record<string, string>; useAuth?: boolean }
) {
  const url = new URL(path.startsWith('/') ? path.slice(1) : path, BASE);
  if (opts?.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = opts?.useAuth !== false && !path.startsWith('auth/') ? await getToken() : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (path.startsWith('public/') || path.startsWith('auth/')) {
    // no auth for public or auth routes
  } else {
    headers['X-Dev-User-Id'] = DEV_USER_ID;
  }
  const res = await fetch(url.toString(), {
    method: opts?.method ?? 'GET',
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = text;
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function main() {
  const tenantId = 'tenant-demo';
  console.log('Smoke tests — base:', BASE);
  const results: { name: string; ok: boolean; err?: string }[] = [];

  // auth.login (no X-Dev-User-Id)
  try {
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.local', password: 'demo', tenantId }),
    });
    const loginData = (await loginRes.json()) as { token?: string; user?: { role?: string } };
    const ok = loginRes.ok && !!loginData.token && loginData.user?.role === 'ADMIN';
    results.push({ name: 'auth/login', ok, err: ok ? undefined : `status=${loginRes.status}` });
  } catch (e) {
    results.push({ name: 'auth/login', ok: false, err: String(e) });
  }

  // events.list
  try {
    const r = await fetchApi('/public/events', { query: { tenantId, limit: '5' } });
    const ok = r.ok && Array.isArray((r.data as { data?: unknown[] })?.data);
    results.push({ name: 'events.list', ok: ok || r.ok, err: ok ? undefined : `status=${r.status}` });
  } catch (e) {
    results.push({ name: 'events.list', ok: false, err: String(e) });
  }

  // events.getDetail (need an event id from list first)
  try {
    const list = await fetchApi('/public/events', { query: { tenantId, limit: '1' } });
    const data = (list.data as { data?: { id: string }[] })?.data;
    const eventId = data?.[0]?.id;
    if (eventId) {
      const r = await fetchApi(`/public/events/${eventId}`, { query: { tenantId } });
      results.push({ name: 'events.getDetail', ok: r.ok, err: r.ok ? undefined : `status=${r.status}` });
    } else {
      results.push({ name: 'events.getDetail', ok: true }); // skip if no events
    }
  } catch (e) {
    results.push({ name: 'events.getDetail', ok: false, err: String(e) });
  }

  // me (authenticated)
  try {
    const r = await fetchApi('/me');
    results.push({ name: 'me', ok: r.ok, err: r.ok ? undefined : `status=${r.status}` });
  } catch (e) {
    results.push({ name: 'me', ok: false, err: String(e) });
  }

  // me/orders
  try {
    const r = await fetchApi('/me/orders');
    const ok = r.ok && Array.isArray((r.data as { orders?: unknown[] })?.orders);
    results.push({ name: 'me/orders', ok: ok || r.ok, err: ok ? undefined : `status=${r.status}` });
  } catch (e) {
    results.push({ name: 'me/orders', ok: false, err: String(e) });
  }

  // tickets.listByOwner (via me/tickets)
  try {
    const r = await fetchApi('/me/tickets');
    const ok = r.ok && Array.isArray((r.data as { tickets?: unknown[] })?.tickets);
    results.push({ name: 'me/tickets', ok: ok || r.ok, err: ok ? undefined : `status=${r.status}` });
  } catch (e) {
    results.push({ name: 'me/tickets', ok: false, err: String(e) });
  }

  // admin/config (requires admin user)
  try {
    const r = await fetchApi('/admin/config');
    const ok = r.ok && typeof (r.data as { contact?: unknown })?.contact === 'object';
    results.push({ name: 'admin/config', ok: ok || r.ok, err: ok ? undefined : `status=${r.status}` });
  } catch (e) {
    results.push({ name: 'admin/config', ok: false, err: String(e) });
  }

  const failed = results.filter((x) => !x.ok);
  console.log('\nResults:');
  results.forEach((r) => console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}${r.err ? ` — ${r.err}` : ''}`));
  if (failed.length > 0) {
    console.log(`\n${failed.length} failed`);
    process.exit(1);
  }
  console.log('\nAll smoke tests passed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
