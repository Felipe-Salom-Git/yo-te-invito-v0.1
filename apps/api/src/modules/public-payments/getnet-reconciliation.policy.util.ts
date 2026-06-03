import type { PaymentStatus } from '@prisma/client';
import type { WebhookStatusMapping } from './providers/getnet/getnet-webhook.util';
import type {
  GetnetReconciliationOutcome,
  ReconciliationReason,
} from './getnet-reconciliation.types';
import { isOrderTicketFulfillmentComplete } from './order-fulfillment.util';

export type ReconciliationOrderContext = {
  id: string;
  status: string;
  expiresAt: Date | null;
};

export type ReconciliationPaymentContext = {
  id: string;
  status: PaymentStatus;
  orderId: string;
};

export type ApprovedPaymentDecision =
  | { kind: 'FULFILL' }
  | { kind: 'ALREADY_FULFILLED' }
  | { kind: 'MANUAL_REVIEW'; reason: ReconciliationReason }
  | { kind: 'SKIPPED'; reason: ReconciliationReason };

export function isOrderExpiredForReconciliation(
  order: ReconciliationOrderContext,
  now: Date = new Date(),
): boolean {
  if (order.status === 'EXPIRED') return true;
  if (order.status === 'PENDING_PAYMENT' && order.expiresAt && order.expiresAt < now) {
    return true;
  }
  return false;
}

export function decideApprovedPaymentAction(input: {
  order: ReconciliationOrderContext;
  payment: ReconciliationPaymentContext;
  existingTicketCount: number;
  expectedTicketCount: number;
  otherApprovedPaymentIds: string[];
  /** For unit tests; production uses current time. */
  now?: Date;
}): ApprovedPaymentDecision {
  const now = input.now ?? new Date();

  if (
    isOrderTicketFulfillmentComplete(
      input.existingTicketCount,
      input.expectedTicketCount,
    )
  ) {
    const otherApproved = input.otherApprovedPaymentIds.filter(
      (id) => id !== input.payment.id,
    );
    if (
      input.order.status === 'PAID' &&
      otherApproved.length > 0 &&
      input.payment.status !== 'APPROVED'
    ) {
      return {
        kind: 'MANUAL_REVIEW',
        reason: 'ORDER_ALREADY_PAID_BY_ANOTHER_PAYMENT',
      };
    }
    return { kind: 'ALREADY_FULFILLED' };
  }

  if (isOrderExpiredForReconciliation(input.order, now)) {
    return {
      kind: 'MANUAL_REVIEW',
      reason: 'ORDER_EXPIRED_PAYMENT_APPROVED',
    };
  }

  if (input.order.status === 'PAID') {
    return {
      kind: 'MANUAL_REVIEW',
      reason: 'ORDER_ALREADY_PAID_BY_ANOTHER_PAYMENT',
    };
  }

  if (input.order.status !== 'PENDING_PAYMENT') {
    return { kind: 'SKIPPED', reason: 'FULFILL_SKIPPED' };
  }

  return { kind: 'FULFILL' };
}

export function mapRemoteMappingToOutcome(
  mapping: WebhookStatusMapping,
  remoteStatus: string,
): GetnetReconciliationOutcome {
  if (mapping.kind === 'unknown') return 'UNKNOWN_REMOTE';
  if (mapping.kind === 'ignored') {
    if (remoteStatus.toUpperCase().includes('REFUND')) return 'IGNORED_REMOTE';
    return 'IGNORED_REMOTE';
  }
  switch (mapping.localStatus) {
    case 'APPROVED':
      return 'FULFILLED'; // provisional; may become manual review
    case 'PENDING':
    case 'CREATED':
      return 'PENDING_REMOTE';
    case 'REJECTED':
      return 'REJECTED_REMOTE';
    case 'CANCELLED':
      return remoteStatus === 'EXPIRED' ? 'EXPIRED_REMOTE' : 'CANCELLED_REMOTE';
    default:
      return 'SKIPPED';
  }
}

export function outcomeFromApprovedDecision(
  decision: ApprovedPaymentDecision,
): GetnetReconciliationOutcome {
  switch (decision.kind) {
    case 'FULFILL':
      return 'FULFILLED';
    case 'ALREADY_FULFILLED':
      return 'ALREADY_FULFILLED';
    case 'MANUAL_REVIEW':
      return 'REQUIRES_MANUAL_REVIEW';
    case 'SKIPPED':
      return 'SKIPPED';
  }
}
