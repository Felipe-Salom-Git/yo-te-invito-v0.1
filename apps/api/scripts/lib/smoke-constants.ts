/** Domain for ephemeral users created by smokes (registerSmokeUser). */
export const SMOKE_TEST_EMAIL_DOMAIN = 'smoke.yo-te-invito.test';

/** Prefix for review/reply bodies created by smokes — used by smoke:cleanup. */
export const SMOKE_TEST_MARKER = '[smoke-test]';

/** Notification referenceKey prefix (seed-demo / E2E). */
export const SMOKE_NOTIFICATION_REF_PREFIX = 'e2e-demo:';

export function isSmokeTestEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${SMOKE_TEST_EMAIL_DOMAIN}`);
}

export function smokeTestComment(text: string): string {
  return `${SMOKE_TEST_MARKER} ${text}`;
}
