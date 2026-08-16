/**
 * Email verification token helpers + in-memory resend rate limit.
 * Tokens are never logged; TTL matches AUTH_VERIFY_EMAIL copy ("24 horas").
 */
import * as crypto from 'crypto';
import { AUTH_RESEND_VERIFICATION_USER_MESSAGES } from '@yo-te-invito/shared';

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_TTL_LABEL = '24 horas';

/** Cooldown per normalized email — blocks double-click / hammering one inbox. */
export const RESEND_EMAIL_MAX = 3;
export const RESEND_EMAIL_WINDOW_MS = 15 * 60 * 1000;

/** Coarser cap per client IP. */
export const RESEND_IP_MAX = 10;
export const RESEND_IP_WINDOW_MS = 15 * 60 * 1000;

export function createEmailVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function emailVerificationExpiresAt(now = Date.now()): Date {
  return new Date(now + EMAIL_VERIFICATION_TTL_MS);
}

export function shouldIssueVerificationEmail(
  user: { emailVerified: Date | null } | null | undefined,
): boolean {
  return Boolean(user) && user!.emailVerified == null;
}

export function genericResendAcceptedMessage(): string {
  return AUTH_RESEND_VERIFICATION_USER_MESSAGES.accepted;
}

export type ResendVerificationAction = 'issue' | 'noop';

/** Central policy: only unverified existing users receive a new token + email. */
export function resendVerificationAction(
  user: { emailVerified: Date | null } | null | undefined,
): ResendVerificationAction {
  return shouldIssueVerificationEmail(user) ? 'issue' : 'noop';
}

export type RateLimitConsumeResult = { ok: true } | { ok: false; retryAfterMs: number };

export class SlidingWindowRateLimiter {
  private readonly buckets = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  consume(key: string): RateLimitConsumeResult {
    const t = this.now();
    const bucket = this.buckets.get(key);
    if (!bucket || t - bucket.windowStart >= this.windowMs) {
      this.buckets.set(key, { count: 1, windowStart: t });
      return { ok: true };
    }
    if (bucket.count >= this.max) {
      return { ok: false, retryAfterMs: this.windowMs - (t - bucket.windowStart) };
    }
    bucket.count += 1;
    return { ok: true };
  }
}
