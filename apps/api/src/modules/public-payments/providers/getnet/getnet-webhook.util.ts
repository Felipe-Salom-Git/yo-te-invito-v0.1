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

  if (normalized === 'AUTHORIZED') {
    return { kind: 'mapped', localStatus: 'APPROVED' };
  }

  if (normalized === 'DENIED') {
    return { kind: 'mapped', localStatus: 'REJECTED' };
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

export function normalizeGetnetWebhookStatus(
  payload: GetnetWebhookBody | Record<string, unknown>,
): string | null {
  const body = payload as GetnetWebhookBody & {
    payment?: { result?: { status?: string } };
  };
  const root = body.status?.trim() || body.paymentStatus?.trim();
  if (root) return root.toUpperCase();

  const nested = body.payment?.result?.status?.trim();
  if (nested) return nested.toUpperCase();

  return null;
}

export type GetnetPaymentLookupKeys = {
  paymentIntentId: string | null;
  orderId: string | null;
  resultPaymentId: string | null;
  legacyExternalId: string | null;
};

export function extractGetnetPaymentLookupKeys(
  body: GetnetWebhookBody,
): GetnetPaymentLookupKeys {
  const raw = body as Record<string, unknown>;
  const payment = raw.payment as Record<string, unknown> | undefined;
  const result = payment?.result as Record<string, unknown> | undefined;

  const paymentIntentId =
    (typeof raw.payment_intent_id === 'string' && raw.payment_intent_id.trim()) ||
    (typeof raw.paymentIntentId === 'string' && raw.paymentIntentId.trim()) ||
    null;

  const resultPaymentId =
    (typeof result?.payment_id === 'string' && result.payment_id.trim()) || null;

  const orderId =
    (typeof raw.order_id === 'string' && raw.order_id.trim()) ||
    body.orderId?.trim() ||
    null;

  const legacyExternalId =
    body.externalPaymentId?.trim() ||
    body.externalReference?.trim() ||
    body.uuid?.trim() ||
    null;

  return { paymentIntentId, orderId, resultPaymentId, legacyExternalId };
}

export type WebCheckoutWebhookInfo = {
  paymentIntentId: string | null;
  checkoutId: string | null;
  externalPaymentId: string | null;
  authorizationCode: string | null;
  webCheckoutStatusRaw: string | null;
  paymentMethod: string | null;
  installment: unknown;
  returnMessage: string | null;
};

export function extractGetnetWebCheckoutWebhookInfo(
  body: GetnetWebhookBody,
): WebCheckoutWebhookInfo {
  const raw = body as Record<string, unknown>;
  const payment = raw.payment as Record<string, unknown> | undefined;
  const result = payment?.result as Record<string, unknown> | undefined;
  const keys = extractGetnetPaymentLookupKeys(body);

  return {
    paymentIntentId: keys.paymentIntentId,
    checkoutId:
      (typeof raw.checkout_id === 'string' && raw.checkout_id.trim()) ||
      (typeof raw.checkoutId === 'string' && raw.checkoutId.trim()) ||
      null,
    externalPaymentId: keys.resultPaymentId,
    authorizationCode:
      (typeof result?.authorization_code === 'string' &&
        result.authorization_code.trim()) ||
      null,
    webCheckoutStatusRaw:
      (typeof result?.status === 'string' && result.status.trim()) || null,
    paymentMethod:
      (typeof payment?.method === 'string' && payment.method.trim()) || null,
    installment: payment?.installment,
    returnMessage:
      (typeof result?.return_message === 'string' && result.return_message.trim()) ||
      null,
  };
}

export function extractGetnetWebhookEventId(body: GetnetWebhookBody): string | null {
  const raw = body as Record<string, unknown>;
  const info = extractGetnetWebCheckoutWebhookInfo(body);
  const id =
    body.eventId?.trim() ||
    body.id?.trim() ||
    info.checkoutId ||
    info.externalPaymentId ||
    info.paymentIntentId ||
    null;
  return id || null;
}

export function extractGetnetExternalPaymentId(
  body: GetnetWebhookBody,
): string | null {
  const keys = extractGetnetPaymentLookupKeys(body);
  return (
    keys.paymentIntentId ||
    keys.resultPaymentId ||
    keys.legacyExternalId ||
    keys.orderId ||
    null
  );
}

export function extractGetnetRemoteStatus(body: GetnetWebhookBody): string {
  return normalizeGetnetWebhookStatus(body) ?? '';
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

export function verifyWebhookBasicAuth(
  authorizationHeader: string | undefined,
  expectedUser: string,
  expectedPassword: string,
): boolean {
  if (!expectedUser || !expectedPassword) return false;
  if (!authorizationHeader?.startsWith('Basic ')) return false;
  try {
    const decoded = Buffer.from(
      authorizationHeader.slice('Basic '.length).trim(),
      'base64',
    ).toString('utf8');
    const sep = decoded.indexOf(':');
    if (sep < 0) return false;
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    return (
      verifyWebhookSecret(user, expectedUser) &&
      verifyWebhookSecret(pass, expectedPassword)
    );
  } catch {
    return false;
  }
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
  webCheckoutWebhookEvents?: WebCheckoutWebhookStoredEvent[];
  lastWebCheckoutWebhook?: WebCheckoutWebhookStoredEvent;
  paymentIntentId?: string;
  checkoutId?: string;
  externalPaymentId?: string;
  authorizationCode?: string;
  webCheckoutStatusRaw?: string;
  paymentMethod?: string;
  installment?: unknown;
};

export type WebCheckoutWebhookStoredEvent = {
  receivedAt: string;
  paymentIntentId?: string;
  checkoutId?: string;
  externalPaymentId?: string;
  authorizationCode?: string;
  webCheckoutStatusRaw?: string;
  paymentMethod?: string;
  installment?: unknown;
  returnMessage?: string;
  remoteStatus: string;
  processedOutcome?: string;
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

export function appendWebCheckoutWebhookMetadata(
  existing: unknown,
  input: {
    info: WebCheckoutWebhookInfo;
    remoteStatus: string;
    processedOutcome?: string;
    sanitizedPayload?: Record<string, unknown>;
  },
  maxEvents = 30,
): PaymentWebhookMetadata {
  const base = readPaymentWebhookMetadata(existing);
  const event: WebCheckoutWebhookStoredEvent = {
    receivedAt: new Date().toISOString(),
    paymentIntentId: input.info.paymentIntentId ?? undefined,
    checkoutId: input.info.checkoutId ?? undefined,
    externalPaymentId: input.info.externalPaymentId ?? undefined,
    authorizationCode: input.info.authorizationCode ?? undefined,
    webCheckoutStatusRaw: input.info.webCheckoutStatusRaw ?? undefined,
    paymentMethod: input.info.paymentMethod ?? undefined,
    installment: input.info.installment,
    returnMessage: input.info.returnMessage ?? undefined,
    remoteStatus: input.remoteStatus,
    processedOutcome: input.processedOutcome,
  };
  const events = [...(base.webCheckoutWebhookEvents ?? []), event].slice(-maxEvents);
  return {
    ...base,
    webCheckoutWebhookEvents: events,
    lastWebCheckoutWebhook: event,
    ...(input.info.paymentIntentId
      ? { paymentIntentId: input.info.paymentIntentId }
      : {}),
    ...(input.info.checkoutId ? { checkoutId: input.info.checkoutId } : {}),
    ...(input.info.externalPaymentId
      ? { externalPaymentId: input.info.externalPaymentId }
      : {}),
    ...(input.info.authorizationCode
      ? { authorizationCode: input.info.authorizationCode }
      : {}),
    ...(input.info.webCheckoutStatusRaw
      ? { webCheckoutStatusRaw: input.info.webCheckoutStatusRaw }
      : {}),
    ...(input.info.paymentMethod ? { paymentMethod: input.info.paymentMethod } : {}),
    ...(input.info.installment !== undefined
      ? { installment: input.info.installment }
      : {}),
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
