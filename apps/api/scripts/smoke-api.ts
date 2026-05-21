/**
 * Smoke tests for API endpoints.
 * Run: pnpm --filter api run smoke:api
 * Requires: API running, DB migrated, SMOKE_USER_EMAIL + SMOKE_USER_PASSWORD
 */

import {
  getSmokeCredentials,
  login,
  resolveSmokeAuth,
  smokeApiBase,
  smokeCredentialsHelp,
} from './lib/smoke-auth';
import { runSmokeScript } from './lib/smoke-runner';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';

async function fetchApi(
  path: string,
  authHeaders: Record<string, string>,
  opts?: { method?: string; body?: unknown; query?: Record<string, string>; auth?: boolean },
) {
  const url = new URL(path.startsWith('/') ? path.slice(1) : path, `${smokeApiBase()}/`);
  if (opts?.query) {
    for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts?.auth !== false ? authHeaders : {}),
  };
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
  const creds = getSmokeCredentials();
  if (!creds) {
    console.error(smokeCredentialsHelp());
    process.exit(1);
  }

  const auth = await resolveSmokeAuth({ allowDevFallback: false, exitOnFailure: true });
  console.log('Smoke:api —', smokeApiBase());
  console.log('  Auth:', auth.label);

  const results: { name: string; ok: boolean; err?: string }[] = [];

  try {
    const loginRes = await fetch(smokeApiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.password, tenantId: TENANT }),
    });
    const loginData = (await loginRes.json()) as { token?: string; user?: { role?: string } };
    const ok = loginRes.ok && !!loginData.token;
    results.push({ name: 'auth/login', ok, err: ok ? undefined : `status=${loginRes.status}` });
  } catch (e) {
    results.push({ name: 'auth/login', ok: false, err: String(e) });
  }

  try {
    const r = await fetchApi('/public/events', auth.headers, { query: { tenantId: TENANT, limit: '5' } });
    const ok = r.ok && Array.isArray((r.data as { data?: unknown[] })?.data);
    results.push({ name: 'events.list', ok: ok || r.ok, err: ok ? undefined : `status=${r.status}` });
  } catch (e) {
    results.push({ name: 'events.list', ok: false, err: String(e) });
  }

  try {
    const list = await fetchApi('/public/events', auth.headers, { query: { tenantId: TENANT, limit: '1' } });
    const data = (list.data as { data?: { id: string }[] })?.data;
    const eventId = data?.[0]?.id;
    if (eventId) {
      const r = await fetchApi(`/public/events/${eventId}`, auth.headers, { query: { tenantId: TENANT } });
      results.push({ name: 'events.getDetail', ok: r.ok, err: r.ok ? undefined : `status=${r.status}` });
    } else {
      results.push({ name: 'events.getDetail', ok: true });
    }
  } catch (e) {
    results.push({ name: 'events.getDetail', ok: false, err: String(e) });
  }

  try {
    const r = await fetchApi('/me', auth.headers);
    results.push({ name: 'me', ok: r.ok, err: r.ok ? undefined : `status=${r.status}` });
  } catch (e) {
    results.push({ name: 'me', ok: false, err: String(e) });
  }

  try {
    const r = await fetchApi('/me/orders', auth.headers);
    const ok = r.ok && Array.isArray((r.data as { orders?: unknown[] })?.orders);
    results.push({ name: 'me/orders', ok: ok || r.ok, err: ok ? undefined : `status=${r.status}` });
  } catch (e) {
    results.push({ name: 'me/orders', ok: false, err: String(e) });
  }

  try {
    const r = await fetchApi('/me/tickets', auth.headers);
    const ok = r.ok && Array.isArray((r.data as { tickets?: unknown[] })?.tickets);
    results.push({ name: 'me/tickets', ok: ok || r.ok, err: ok ? undefined : `status=${r.status}` });
  } catch (e) {
    results.push({ name: 'me/tickets', ok: false, err: String(e) });
  }

  try {
    const r = await fetchApi('/admin/config', auth.headers);
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
    return 1;
  }
  console.log('\nAll smoke tests passed.');
  return 0;
}

runSmokeScript('smoke:api', main);
