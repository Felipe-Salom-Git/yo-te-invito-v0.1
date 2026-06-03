import { createHash, timingSafeEqual } from 'crypto';
import type { PaymentStatus } from '@prisma/client';
import type { GetnetWebhookBody } from '@yo-te-invito/shared';
import { mapGetnetStatusToLocal } from './getnet.mapper';
import type { GetnetRemoteStatus } from './getnet-checkout.service';

export type GetnetWebhookRemoteStatus =
  | GetnetRemoteStatus
  | 'CANCELLED'
  | 'REFUNDED'
  | string;

export type WebhookStatusMapping =
  | { kind: 'mapped'; localStatus: PaymentStatus }
  | { kind: 'ignored'; reason: string }
  | { kind: 'unknown'; remoteStatus: string };

const REFUNDED_STATUSES = new Set(['REFUNDED', 'CHARGEBACK', 'CHARGED_BACK']);

/**
 * Maps webhook status string to local `PaymentStatus` or marks ignored/unknown.
 * `REFUNDED` is documented only — no ticket reversal in Slice B.
 */
export function mapGetnetWebhookStatusToLocal(
  remote: string,
): WebhookStatusMapping {
  const normalized = remote?.trim()?.toUpperCase() ?? '';

  if (!normalized) {
    return { kind: 'unknown', remoteStatus: remote ?? '' };
  }

  if (REFUNDED_STATUSES.has(normalized)) {
    return {
      kind: 'ignored',
      reason: 'REFUNDED not applied in Slice B (no ticket reversal)',
    };
  }

  if (normalized === 'CANCELLED' || normalized === 'CANCELED') {
    return { kind: 'mapped', localStatus: 'CANCELLED' };
  }

  const known = new Set([
    'SUCCESS',
    'APPROVED',
    'PENDING',
    'IN_PROGRESS',
    'PROCESSING',
    'FAILED',
    'REJECTED',
    'EXPIRED',
  ]);
  if (!known.has(normalized)) {
    return { kind: 'unknown', remoteStatus: normalized };
  }

  return { kind: 'mapped', localStatus: mapGetnetStatusToLocal(normalized as GetnetRemoteStatus) };
}

export function extractGetnetWebhookEventId(body: GetnetWebhookBody): string | null {
  const id = body.eventId?.trim() || body.id?.trim();
  return id || null;
}

export function extractGetnetExternalPaymentId(
  body: GetnetWebhookBody,
): string | null {
  return (
    body.externalPaymentId?.trim() ||
    body.externalReference?.trim() ||
    body.uuid?.trim() ||
    body.orderId?.trim() ||
    null
  );
}

export function extractGetnetRemoteStatus(body: GetnetWebhookBody): string {
  return (body.status?.trim() || body.paymentStatus?.trim() || '').toUpperCase();
}

/** SHA-256 hex of canonical JSON (no PAN/CVV — caller must not pass card fields). */
export function hashWebhookPayload(payload: unknown): string {
  const canonical = JSON.stringify(payload ?? {});
  return createHash('sha256').update(canonical).digest('hex');
}

export function verifyWebhookSecret(
  provided: string | undefined,
  expected: string,
): boolean {
  if (!expected) return false;
  if (!provided) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type StoredWebhookEvent = {
  receivedAt: string;
  eventId?: string;
  externalPaymentId?: string;
  remoteStatus: string;
  source: 'GETNET_WEBHOOK';
  processedOutcome: string;
  payloadHash: string;
  idempotencyKey: string;
};

export type PaymentWebhookMetadata = {
  getnetWebhookEvents?: StoredWebhookEvent[];
  processedWebhookEventIds?: string[];
  orderConfirmationEmailSent?: boolean;
};

export function readPaymentWebhookMetadata(metadata: unknown): PaymentWebhookMetadata {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  return metadata as PaymentWebhookMetadata;
}

export function buildWebhookIdempotencyKey(input: {
  eventId: string | null;
  externalPaymentId: string;
  remoteStatus: string;
  payloadHash: string;
}): string {
  if (input.eventId) {
    return `evt:${input.eventId}`;
  }
  return `hash:${input.externalPaymentId}:${input.remoteStatus}:${input.payloadHash.slice(0, 16)}`;
}

export function isDuplicateWebhookEvent(
  metadata: PaymentWebhookMetadata,
  idempotencyKey: string,
): boolean {
  const ids = metadata.processedWebhookEventIds ?? [];
  return ids.includes(idempotencyKey);
}

export function appendWebhookEventMetadata(
  existing: unknown,
  event: StoredWebhookEvent,
  idempotencyKey: string,
  maxEvents = 30,
): PaymentWebhookMetadata {
  const base = readPaymentWebhookMetadata(existing);
  const events = [...(base.getnetWebhookEvents ?? []), event].slice(-maxEvents);
  const processedIds = [...(base.processedWebhookEventIds ?? []), idempotencyKey].slice(
    -100,
  );
  return {
    ...base,
    getnetWebhookEvents: events,
    processedWebhookEventIds: [...new Set(processedIds)],
  };
}

/**
 * Do not downgrade an approved payment from a late rejection webhook.
 */
export function shouldApplyPaymentStatusUpdate(
  current: PaymentStatus,
  next: PaymentStatus,
): boolean {
  if (current === next) return false;
  if (current === 'APPROVED') {
    return next === 'APPROVED';
  }
  return true;
}

/** Strip keys that may carry PCI-like data before hashing/logging. */
export function sanitizeWebhookBodyForStorage(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const deny = new Set([
    'card',
    'cardNumber',
    'pan',
    'cvv',
    'cvc',
    'securityCode',
    'holder',
    'customer',
  ]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (deny.has(key)) continue;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      out[key] = sanitizeWebhookBodyForStorage(value as Record<string, unknown>);
    } else if (typeof value === 'string' && value.length > 500) {
      out[key] = `${value.slice(0, 500)}…`;
    } else {
      out[key] = value;
    }
  }
  return out;
}
