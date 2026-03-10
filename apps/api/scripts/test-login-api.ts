/**
 * Test POST /auth/login for demo users.
 * Run: cd apps/api && npx tsx scripts/test-login-api.ts
 * Requires: API running (or run against remote), demo-seed done.
 */
const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';

const USERS = [
  { email: 'admin@demo.local', password: 'demo', role: 'ADMIN' },
  { email: 'producer@demo.local', password: 'demo', role: 'PRODUCER_OWNER' },
  { email: 'gastro@demo.local', password: 'demo', role: 'GASTRO_OWNER' },
  { email: 'user@demo.local', password: 'demo', role: 'USER' },
];

async function testLogin(email: string, password: string, expectedRole: string) {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantId: 'tenant-demo' }),
    });
    const data = (await res.json()) as { token?: string; user?: { role?: string } };
    const ok = res.ok && data.token && data.user?.role === expectedRole;
    console.log(
      ok ? '✓' : '✗',
      email,
      expectedRole,
      res.status,
      ok ? 'OK' : JSON.stringify(data)
    );
    return ok;
  } catch (e) {
    console.log('✗', email, 'ERROR', String(e));
    return false;
  }
}

async function main() {
  console.log('Testing auth/login at', API_BASE, '\n');
  let passed = 0;
  for (const u of USERS) {
    const ok = await testLogin(u.email, u.password, u.role);
    if (ok) passed++;
  }
  console.log('\n', passed, '/', USERS.length, 'passed');
  process.exit(passed === USERS.length ? 0 : 1);
}

main();
