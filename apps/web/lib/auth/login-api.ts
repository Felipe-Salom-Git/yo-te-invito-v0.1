import {
  AUTH_LOGIN_ERROR_CODES,
  AUTH_LOGIN_USER_MESSAGES,
} from '@yo-te-invito/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';
const TENANT_ID = 'tenant-demo';

export type CredentialsLoginFailure = {
  ok: false;
  code: string;
  message: string;
};

export type CredentialsLoginSuccess = {
  ok: true;
};

export type CredentialsLoginResult = CredentialsLoginFailure | CredentialsLoginSuccess;

/** Pre-flight login against API — surfaces EMAIL_NOT_VERIFIED before NextAuth signIn. */
export async function attemptCredentialsLogin(
  email: string,
  password: string,
): Promise<CredentialsLoginResult> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantId: TENANT_ID }),
    });

    if (res.ok) {
      return { ok: true };
    }

    const data = (await res.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };

    if (data.code === AUTH_LOGIN_ERROR_CODES.EMAIL_NOT_VERIFIED) {
      return {
        ok: false,
        code: AUTH_LOGIN_ERROR_CODES.EMAIL_NOT_VERIFIED,
        message: data.message ?? AUTH_LOGIN_USER_MESSAGES.emailNotVerified,
      };
    }

    return {
      ok: false,
      code: data.code ?? AUTH_LOGIN_ERROR_CODES.UNAUTHORIZED,
      message: data.message ?? AUTH_LOGIN_USER_MESSAGES.invalidCredentials,
    };
  } catch {
    return {
      ok: false,
      code: AUTH_LOGIN_ERROR_CODES.UNAUTHORIZED,
      message: AUTH_LOGIN_USER_MESSAGES.invalidCredentials,
    };
  }
}
