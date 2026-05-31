/**
 * Shared auth for API smoke scripts — no @demo.local defaults.
 *
 * Required for full runs:
 *   SMOKE_USER_EMAIL=felipe.e.salom@gmail.com
 *   SMOKE_USER_PASSWORD=<password>
 *
 * Optional:
 *   SMOKE_SECOND_USER_EMAIL — transfer / second-party flows
 *   SMOKE_NON_ADMIN_EMAIL + SMOKE_NON_ADMIN_PASSWORD — USER común para smokes auth (prod)
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
    'Production auth smokes: SMOKE_NON_ADMIN_EMAIL + SMOKE_NON_ADMIN_PASSWORD (USER común, no ADMIN)',
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

function summarizeHttpBody(text: string, parsed: unknown): string {
  if (typeof parsed === 'object' && parsed !== null) {
    const record = parsed as Record<string, unknown>;
    const parts: string[] = [];
    if (record.code != null) parts.push(`code=${String(record.code)}`);
    if (record.message != null) {
      parts.push(`message=${String(record.message).slice(0, 240)}`);
    }
    if (parts.length > 0) return parts.join(' ');
  }
  const trimmed = text.trim();
  return trimmed ? trimmed.slice(0, 300) : '(empty body)';
}

function probableRegisterFailureCause(status: number, parsed: unknown): string {
  const code =
    typeof parsed === 'object' && parsed !== null && 'code' in parsed
      ? String((parsed as { code?: unknown }).code)
      : '';

  if (status === 400 && (code.includes('LEGAL') || code.includes('MISSING_LEGAL'))) {
    return 'Registro público bloqueado (aceptación legal requerida). Use SMOKE_NON_ADMIN_EMAIL + SMOKE_NON_ADMIN_PASSWORD con un USER existente.';
  }
  if (status === 400 && code === 'VALIDATION_FAILED') {
    return 'Payload de registro rechazado por validación.';
  }
  if (status === 409) {
    return 'Email ya registrado.';
  }
  if (status === 403) {
    return 'Registro público deshabilitado o prohibido.';
  }
  if (status >= 500) {
    return 'Error del servidor durante el registro.';
  }
  return 'Registro efímero no disponible en este entorno. Configure SMOKE_NON_ADMIN_EMAIL + SMOKE_NON_ADMIN_PASSWORD.';
}

async function attemptRegisterSmokeUser(prefix: string): Promise<
  | { ok: true; user: { token: string; userId: string; email: string } }
  | { ok: false; endpoint: string; status: number; bodySummary: string; probableCause: string }
> {
  const email = `smoke-${prefix}-${Date.now()}@smoke.yo-te-invito.test`;
  const password = process.env.SMOKE_REGISTER_PASSWORD ?? process.env.SMOKE_USER_PASSWORD ?? 'SmokeTest1!';
  const endpoint = `${BASE}/auth/register`;

  try {
    const res = await fetch(endpoint, {
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
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }

    if (!res.ok) {
      return {
        ok: false,
        endpoint,
        status: res.status,
        bodySummary: summarizeHttpBody(text, parsed),
        probableCause: probableRegisterFailureCause(res.status, parsed),
      };
    }

    const data = parsed as { token?: string; user?: { id?: string } };
    if (!data.token || !data.user?.id) {
      return {
        ok: false,
        endpoint,
        status: res.status,
        bodySummary: summarizeHttpBody(text, parsed),
        probableCause: 'Respuesta 200 sin token/user.id — registro incompleto.',
      };
    }

    trackSmokeUserId(data.user.id);
    return {
      ok: true,
      user: { token: data.token, userId: data.user.id, email },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      endpoint,
      status: 0,
      bodySummary: msg,
      probableCause: 'No se pudo contactar la API (red/DNS/TLS).',
    };
  }
}

export type SmokeNonAdminUser = {
  token: string;
  userId: string;
  email: string;
  source: 'env' | 'registered';
};

/**
 * USER común for auth smokes (403 platform). Prefers SMOKE_NON_ADMIN_* in production.
 */
export async function resolveSmokeNonAdminUser(prefix: string): Promise<
  | { ok: true; user: SmokeNonAdminUser }
  | { ok: false; lines: string[] }
> {
  const nonAdminEmail = process.env.SMOKE_NON_ADMIN_EMAIL?.trim().toLowerCase();
  const nonAdminPassword = process.env.SMOKE_NON_ADMIN_PASSWORD;

  if (nonAdminEmail && nonAdminPassword) {
    const endpoint = `${BASE}/auth/login`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nonAdminEmail, password: nonAdminPassword, tenantId: TENANT }),
      });
      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : undefined;
      } catch {
        parsed = text;
      }

      if (!res.ok) {
        return {
          ok: false,
          lines: [
            'Could not login SMOKE_NON_ADMIN user.',
            `  endpoint: POST ${endpoint}`,
            `  status: ${res.status}`,
            `  body: ${summarizeHttpBody(text, parsed)}`,
            '  probable cause: credenciales incorrectas o usuario inexistente/inactivo.',
          ],
        };
      }

      const data = parsed as { token?: string; user?: { id?: string } };
      if (!data.token || !data.user?.id) {
        return {
          ok: false,
          lines: [
            'SMOKE_NON_ADMIN login returned 200 without token/user.id.',
            `  endpoint: POST ${endpoint}`,
            `  body: ${summarizeHttpBody(text, parsed)}`,
          ],
        };
      }

      return {
        ok: true,
        user: {
          token: data.token,
          userId: data.user.id,
          email: nonAdminEmail,
          source: 'env',
        },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        lines: [
          'Could not login SMOKE_NON_ADMIN user.',
          `  endpoint: POST ${endpoint}`,
          `  error: ${msg}`,
          '  probable cause: API unreachable from this host.',
        ],
      };
    }
  }

  const registered = await attemptRegisterSmokeUser(prefix);
  if (registered.ok) {
    return {
      ok: true,
      user: { ...registered.user, source: 'registered' },
    };
  }

  return {
    ok: false,
    lines: [
      'Could not register ephemeral smoke USER.',
      `  endpoint: POST ${registered.endpoint}`,
      `  status: ${registered.status}`,
      `  body: ${registered.bodySummary}`,
      `  probable cause: ${registered.probableCause}`,
      '',
      'For production, set an existing non-admin account:',
      '  SMOKE_NON_ADMIN_EMAIL=<user@example.com>',
      '  SMOKE_NON_ADMIN_PASSWORD=<password>',
    ],
  };
}

export async function registerSmokeUser(
  prefix: string,
): Promise<{ token: string; userId: string; email: string } | null> {
  const result = await attemptRegisterSmokeUser(prefix);
  return result.ok ? result.user : null;
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
