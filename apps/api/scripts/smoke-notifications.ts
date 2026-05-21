/**
 * Smoke: notificaciones portal
 * API :3001, migración user_notifications
 */
import { resolveSmokeAuth, smokeApiUrl } from './lib/smoke-auth';
import { runSmokeScript } from './lib/smoke-runner';

async function main() {
  let passed = 0;
  let failed = 0;
  const ok = (m: string) => {
    passed++;
    console.log(`  ✓ ${m}`);
  };
  const fail = (m: string) => {
    failed++;
    console.log(`  ✗ ${m}`);
  };

  const auth = await resolveSmokeAuth();
  console.log('  Auth:', auth.label);
  const headers = { ...auth.headers, 'Content-Type': 'application/json' };

  const listRes = await fetch(smokeApiUrl('/me/notifications'), { headers });
  if (listRes.ok) {
    const j = (await listRes.json()) as { unreadCount?: number; items?: unknown[] };
    ok(`GET /me/notifications unread=${j.unreadCount ?? '?'}`);
  } else fail(`GET /me/notifications ${listRes.status}`);

  const countRes = await fetch(smokeApiUrl('/me/notifications/unread-count'), { headers });
  if (countRes.ok) ok('GET /me/notifications/unread-count');
  else fail(`unread-count ${countRes.status}`);

  const seedRes = await fetch(smokeApiUrl('/admin/notifications/seed-demo'), {
    method: 'POST',
    headers,
  });
  if (seedRes.ok) ok('POST /admin/notifications/seed-demo');
  else fail(`seed-demo ${seedRes.status} (¿rol ADMIN?)`);

  const runRes = await fetch(smokeApiUrl('/admin/notifications/run'), {
    method: 'POST',
    headers,
  });
  if (runRes.ok) {
    const j = await runRes.json();
    ok(`POST /admin/notifications/run ${JSON.stringify(j)}`);
  } else {
    fail(`admin run ${runRes.status} (¿rol ADMIN?)`);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  return failed > 0 ? 1 : 0;
}

runSmokeScript('smoke:notifications', main);
