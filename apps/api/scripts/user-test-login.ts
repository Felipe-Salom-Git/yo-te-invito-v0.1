/**
 * Test POST /auth/login for one or more accounts (no @demo.local defaults).
 *
 * Run:
 *   SMOKE_USER_EMAIL=... SMOKE_USER_PASSWORD=... pnpm --filter api run user:test-login
 *   pnpm --filter api run user:test-login -- user@example.com
 *   pnpm --filter api run user:test-login -- a@x.com b@x.com  (same password env)
 */

const API_BASE = (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
);
const TENANT = process.env.SMOKE_TENANT_ID ?? process.env.E2E_TENANT_ID ?? 'tenant-demo';

async function testLogin(email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantId: TENANT }),
    });
    const data = (await res.json()) as { token?: string; user?: { id?: string; role?: string } };
    const ok = res.ok && Boolean(data.token) && Boolean(data.user?.id);
    console.log(
      ok ? '✓' : '✗',
      email,
      data.user?.role ?? '-',
      res.status,
      ok ? 'OK' : JSON.stringify(data),
    );
    return ok;
  } catch (e) {
    console.log('✗', email, 'ERROR', String(e));
    return false;
  }
}

async function main() {
  const argvEmails = process.argv
    .slice(2)
    .filter((a) => !a.startsWith('--'))
    .map((e) => e.trim().toLowerCase());

  const envEmail = process.env.SMOKE_USER_EMAIL?.trim().toLowerCase();
  const emails = argvEmails.length > 0 ? argvEmails : envEmail ? [envEmail] : [];

  const password = process.env.SMOKE_USER_PASSWORD ?? process.env.USER_TEST_PASSWORD;
  if (emails.length === 0 || !password) {
    console.error('Set SMOKE_USER_EMAIL + SMOKE_USER_PASSWORD, or pass emails + USER_TEST_PASSWORD.');
    console.error('Usage: pnpm --filter api run user:test-login -- [email ...]');
    process.exit(1);
  }

  console.log('Testing auth/login at', API_BASE, '\n');
  let passed = 0;
  for (const email of emails) {
    if (await testLogin(email, password)) passed++;
  }
  console.log('\n', passed, '/', emails.length, 'passed');
  process.exit(passed === emails.length ? 0 : 1);
}

main();
