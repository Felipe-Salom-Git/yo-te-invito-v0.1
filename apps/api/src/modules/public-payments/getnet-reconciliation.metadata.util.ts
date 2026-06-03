import type { Prisma } from '@prisma/client';
import type { ReconciliationReason } from './getnet-reconciliation.types';
import { readPaymentWebhookMetadata, type PaymentWebhookMetadata } from './providers/getnet/getnet-webhook.util';

export type ReconciliationStatus =
  | 'REQUIRES_MANUAL_REVIEW'
  | 'MANUAL_REVIEWED'
  | 'AUTO_OK'
  | 'RESOLVED';

export type PaymentReconciliationMetadata = PaymentWebhookMetadata & {
  reconciliationStatus?: ReconciliationStatus;
  reconciliationReason?: ReconciliationReason | string;
  reconciliationSource?: string;
  reconciliationUpdatedAt?: string;
  reconciliationAlertSentAt?: string;
  reconciliationAlertReason?: string;
  lastReconciliationOutcome?: string;
  lastReconciliationAt?: string;
  reconciliationReviewedAt?: string;
  reconciliationReviewedByUserId?: string;
  reconciliationReviewedNote?: string;
};

export function readPaymentReconciliationMetadata(
  metadata: unknown,
): PaymentReconciliationMetadata {
  return readPaymentWebhookMetadata(metadata) as PaymentReconciliationMetadata;
}

export function mergeReconciliationMetadata(
  existing: unknown,
  patch: Partial<PaymentReconciliationMetadata>,
): PaymentReconciliationMetadata {
  const base = readPaymentReconciliationMetadata(existing);
  return {
    ...base,
    ...patch,
  };
}

export function shouldSendReconciliationAlert(
  metadata: PaymentReconciliationMetadata,
  reason: string,
): boolean {
  if (
    metadata.reconciliationAlertSentAt &&
    metadata.reconciliationAlertReason === reason
  ) {
    return false;
  }
  return true;
}

export function asMetadataJson(
  meta: PaymentReconciliationMetadata,
): Prisma.InputJsonValue {
  return meta as Prisma.InputJsonValue;
}
