import { z } from 'zod';

/** Prefix estable para Scanner/PWA. Distinto de tickets (`yti:v1:`) y Gastro (`yti:gastro-discount:v1`). */
export const ACTIVITY_COUPON_QR_PREFIX = 'yti:activity-coupon:v1';

const TOKEN_PATTERN = /^[a-f0-9]{16,128}$/i;
const ID_PATTERN = /^[a-z0-9]{10,64}$/i;

export const activityCouponQrPayloadV1Schema = z
  .string()
  .min(1)
  .refine(
    (s) => parseActivityCouponQrPayload(s)?.version === 'v1',
    'Payload QR inválido (se espera yti:activity-coupon:v1:couponId:token)',
  );

export type ActivityCouponQrPayloadV1 = z.infer<typeof activityCouponQrPayloadV1Schema>;

export type ParsedActivityCouponQrV1 = {
  version: 'v1';
  couponId: string;
  token: string;
};

/**
 * Payload QR público. No incluye tenant ni secrets — solo id de cupón + token opaco del claim.
 */
export function buildActivityCouponQrPayload(couponId: string, token: string): string {
  const id = couponId.trim();
  const tok = token.trim();
  if (!ID_PATTERN.test(id)) {
    throw new Error('Invalid activity coupon id for QR payload');
  }
  if (!TOKEN_PATTERN.test(tok)) {
    throw new Error('Invalid activity coupon token for QR payload');
  }
  return `${ACTIVITY_COUPON_QR_PREFIX}:${id}:${tok}`;
}

export function isValidActivityCouponQrPayload(payload: string): boolean {
  return parseActivityCouponQrPayload(payload) !== null;
}

export function parseActivityCouponQrPayload(raw: string): ParsedActivityCouponQrV1 | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith(`${ACTIVITY_COUPON_QR_PREFIX}:`)) return null;

  const rest = trimmed.slice(ACTIVITY_COUPON_QR_PREFIX.length + 1);
  const colon = rest.indexOf(':');
  if (colon <= 0) return null;
  const couponId = rest.slice(0, colon);
  const token = rest.slice(colon + 1);
  if (!ID_PATTERN.test(couponId) || !TOKEN_PATTERN.test(token)) return null;
  return { version: 'v1', couponId, token };
}
