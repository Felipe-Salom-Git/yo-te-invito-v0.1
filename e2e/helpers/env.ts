export const E2E_API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3001';

/** Required for login/API tests — no @demo.local defaults. */
export const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL?.trim().toLowerCase();
export const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD;

export function hasE2eCredentials(): boolean {
  return Boolean(E2E_USER_EMAIL && E2E_USER_PASSWORD);
}

export function e2eCredentialsHelp(): string {
  return 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD (e.g. felipe.e.salom@gmail.com)';
}

export function isApiAvailable(): boolean {
  return process.env.E2E_API_AVAILABLE === '1';
}
