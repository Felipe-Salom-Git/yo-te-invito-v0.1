/**
 * Shared auth for API smoke scripts — no @demo.local defaults.
 *
 * Required for full runs:
 *   SMOKE_USER_EMAIL=felipe.e.salom@gmail.com
 *   SMOKE_USER_PASSWORD=<password>
 *
 * Optional:
 *   SMOKE_SECOND_USER_EMAIL — transfer / second-party flows
 *   SMOKE_SCANNER_EMAIL + SMOKE_SCANNER_PASSWORD — door scan in user-portal smoke
 *   SMOKE_ALLOW_DEV_AUTH=1 — fallback X-Dev-User-Id (API DEV_AUTH_ENABLED only)
 *   SMOKE_DEV_USER_ID — dev header user id (default user-admin)
 */

import { trackSmokeUserId } from './smoke-cleanup';

const BASE = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const DEV_USER_ID = process.env.SMOKE_DEV_USER_ID ?? 'user-admin';

export const SMOKE_MASTER_EMAIL = 'felipe.e.salom@gmail.com';

export type SmokeAuth = {
  token: string | null;
  userId: string;
  label: string;
  headers: Record<string, string>;
};

export function smokeCredentialsHelp(): string {
  return [
    'Set credentials before running smokes:',
    '  SMOKE_USER_EMAIL=felipe.e.salom@gmail.com',
    '  SMOKE_USER_PASSWORD=<your-password>',
    '',
    'Optional: SMOKE_SECOND_USER_EMAIL, SMOKE_SCANNER_EMAIL, SMOKE_SCANNER_PASSWORD',
    'Dev-only fallback: SMOKE_ALLOW_DEV_AUTH=1 (requires API DEV_AUTH_ENABLED=true)',
  ].join('\n');
}

export function getSmokeCredentials():
  | { email: string; password: string }
  | null {
  const email = process.env.SMOKE_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.SMOKE_USER_PASSWORD;
  if (!email || !password) return null;
  return { email, password };
}

export async function login(
  email: string,
  password: string,
): Promise<{ token: string; userId: string } | null> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, tenantId: TENANT }),
  });
  const data = (await res.json()) as { token?: string; user?: { id?: string } };
  if (!res.ok || !data.token || !data.user?.id) return null;
  return { token: data.token, userId: data.user.id };
}

export async function registerSmokeUser(
  prefix: string,
): Promise<{ token: string; userId: string; email: string } | null> {
  const email = `smoke-${prefix}-${Date.now()}@smoke.yo-te-invito.test`;
  const password = process.env.SMOKE_REGISTER_PASSWORD ?? process.env.SMOKE_USER_PASSWORD ?? 'SmokeTest1!';
  try {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        firstName: 'Smoke',
        lastName: prefix,
        tenantId: TENANT,
        profileType: 'USER',
      }),
    });
    const data = (await res.json()) as { token?: string; user?: { id?: string } };
    if (!res.ok || !data.token || !data.user?.id) return null;
    trackSmokeUserId(data.user.id);
    return { token: data.token, userId: data.user.id, email };
  } catch {
    return null;
  }
}

function devAuthFallback(): SmokeAuth {
  return {
    token: null,
    userId: DEV_USER_ID,
    label: `X-Dev-User-Id ${DEV_USER_ID}`,
    headers: { 'X-Dev-User-Id': DEV_USER_ID },
  };
}

/**
 * Primary smoke auth. Fails process (exit 1) when credentials missing/invalid unless allowDevFallback.
 */
export async function resolveSmokeAuth(options?: {
  allowDevFallback?: boolean;
  exitOnFailure?: boolean;
}): Promise<SmokeAuth> {
  const allowDev = options?.allowDevFallback ?? process.env.SMOKE_ALLOW_DEV_AUTH === '1';
  const exitOnFailure = options?.exitOnFailure ?? true;

  const creds = getSmokeCredentials();
  if (creds) {
    const s = await login(creds.email, creds.password);
    if (s) {
      return {
        token: s.token,
        userId: s.userId,
        label: creds.email,
        headers: { Authorization: `Bearer ${s.token}` },
      };
    }
    console.error(`\n[smoke] Login failed for SMOKE_USER_EMAIL=${creds.email}`);
  } else {
    console.error('\n[smoke] SMOKE_USER_EMAIL and SMOKE_USER_PASSWORD are required.');
  }

  if (allowDev) {
    console.warn('[smoke] Using X-Dev-User-Id fallback (SMOKE_ALLOW_DEV_AUTH=1).');
    return devAuthFallback();
  }

  console.error(smokeCredentialsHelp());
  if (exitOnFailure) process.exit(1);
  return devAuthFallback();
}

/** Second user for transfers; never uses @demo.local. */
export async function resolveSecondarySmokeAuth(
  primaryUserId: string,
): Promise<{ token: string; userId: string; email: string; label: string } | null> {
  const secondEmail = process.env.SMOKE_SECOND_USER_EMAIL?.trim().toLowerCase();
  const secondPass = process.env.SMOKE_SECOND_USER_PASSWORD ?? process.env.SMOKE_USER_PASSWORD;
  if (secondEmail && secondPass) {
    const s = await login(secondEmail, secondPass);
    if (s && s.userId !== primaryUserId) {
      return { ...s, email: secondEmail, label: secondEmail };
    }
  }

  const registered = await registerSmokeUser('secondary');
  if (registered && registered.userId !== primaryUserId) {
    return { ...registered, label: registered.email };
  }
  return null;
}

export async function resolveScannerSmokeAuth(): Promise<SmokeAuth | null> {
  const email = process.env.SMOKE_SCANNER_EMAIL?.trim().toLowerCase();
  const password = process.env.SMOKE_SCANNER_PASSWORD ?? process.env.SMOKE_USER_PASSWORD;
  if (!email || !password) return null;
  const s = await login(email, password);
  if (!s) return null;
  return {
    token: s.token,
    userId: s.userId,
    label: email,
    headers: { Authorization: `Bearer ${s.token}` },
  };
}

export function smokeApiBase(): string {
  return BASE.replace(/\/$/, '');
}

export function smokeApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${smokeApiBase()}${p}`;
}
