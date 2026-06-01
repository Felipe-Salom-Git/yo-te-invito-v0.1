import type { StoredWebhookEvent } from '../public-payments/providers/getnet/getnet-webhook.util';
import {
  readPaymentReconciliationMetadata,
  type PaymentReconciliationMetadata,
} from '../public-payments/getnet-reconciliation.metadata.util';

const OPERATIONAL_METADATA_KEYS = [
  'reconciliationStatus',
  'reconciliationReason',
  'reconciliationSource',
  'reconciliationUpdatedAt',
  'reconciliationAlertSentAt',
  'reconciliationAlertReason',
  'lastReconciliationOutcome',
  'lastReconciliationAt',
  'reconciliationReviewedAt',
  'reconciliationReviewedByUserId',
  'reconciliationReviewedNote',
  'returnUrl',
  'cancelUrl',
  'getnetReturnConfiguredAt',
  'orderConfirmationEmailSent',
] as const;

export function paymentRequiresManualReview(
  meta: PaymentReconciliationMetadata,
): boolean {
  return meta.reconciliationStatus === 'REQUIRES_MANUAL_REVIEW';
}

export function paymentCanMarkReviewed(meta: PaymentReconciliationMetadata): boolean {
  return meta.reconciliationStatus === 'REQUIRES_MANUAL_REVIEW';
}

export function extractOperationalMetadata(metadata: unknown): Record<string, unknown> {
  const meta = readPaymentReconciliationMetadata(metadata);
  const out: Record<string, unknown> = {};
  for (const key of OPERATIONAL_METADATA_KEYS) {
    const value = meta[key as keyof PaymentReconciliationMetadata];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  const processed = meta.processedWebhookEventIds;
  if (processed?.length) {
    out.processedWebhookEventCount = processed.length;
  }
  return out;
}

export function extractWebhookEventsForAdmin(
  metadata: unknown,
): StoredWebhookEvent[] {
  const meta = readPaymentReconciliationMetadata(metadata);
  return [...(meta.getnetWebhookEvents ?? [])].reverse();
}
