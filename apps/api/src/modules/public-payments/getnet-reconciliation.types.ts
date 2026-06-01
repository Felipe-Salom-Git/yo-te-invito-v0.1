import type { FulfillPaidOrderSource } from './order-fulfillment.types';

export type GetnetReconciliationSource =
  | 'GETNET_POLL'
  | 'GETNET_WEBHOOK'
  | 'MANUAL_RECONCILIATION'
  | 'ADMIN_MANUAL'
  | 'GETNET_SCRIPT';

export type GetnetReconciliationOutcome =
  | 'FULFILLED'
  | 'ALREADY_FULFILLED'
  | 'PENDING_REMOTE'
  | 'REJECTED_REMOTE'
  | 'EXPIRED_REMOTE'
  | 'CANCELLED_REMOTE'
  | 'REQUIRES_MANUAL_REVIEW'
  | 'PAYMENT_NOT_FOUND'
  | 'REMOTE_STATUS_UNAVAILABLE'
  | 'SKIPPED'
  | 'IGNORED_REMOTE'
  | 'UNKNOWN_REMOTE';

export type ReconciliationReason =
  | 'ORDER_EXPIRED_PAYMENT_APPROVED'
  | 'ORDER_ALREADY_PAID_BY_ANOTHER_PAYMENT'
  | 'REMOTE_REFUNDED'
  | 'REMOTE_UNKNOWN'
  | 'REMOTE_STATUS_CONFLICT'
  | 'FULFILL_SKIPPED';

export interface ReconcilePaymentOptions {
  source: GetnetReconciliationSource;
  dryRun?: boolean;
  /** When set (webhook), skip Getnet API fetch. */
  remoteStatusOverride?: string;
  tenantId?: string;
}

export interface ReconcilePaymentResult {
  paymentId: string;
  orderId: string;
  outcome: GetnetReconciliationOutcome;
  remoteStatus?: string;
  localPaymentStatus?: string;
  orderStatus?: string;
  fulfillOutcome?: 'fulfilled' | 'alreadyFulfilled' | 'skipped';
  reconciliationReason?: ReconciliationReason;
  message?: string;
  dryRun?: boolean;
}

export interface ReconcilePendingPaymentsOptions {
  tenantId?: string;
  limit?: number;
  olderThanMinutes?: number;
  dryRun?: boolean;
  source?: GetnetReconciliationSource;
}

export interface ReconcileBatchSummary {
  reviewed: number;
  fulfilled: number;
  alreadyFulfilled: number;
  pending: number;
  rejected: number;
  requiresManualReview: number;
  skipped: number;
  errors: number;
  dryRun: boolean;
  results: ReconcilePaymentResult[];
}

export function toFulfillSource(
  source: GetnetReconciliationSource,
): FulfillPaidOrderSource {
  switch (source) {
    case 'GETNET_POLL':
      return 'GETNET_POLL';
    case 'GETNET_WEBHOOK':
      return 'GETNET_WEBHOOK';
    case 'MANUAL_RECONCILIATION':
    case 'ADMIN_MANUAL':
    case 'GETNET_SCRIPT':
      return 'MANUAL_RECONCILIATION';
  }
}
