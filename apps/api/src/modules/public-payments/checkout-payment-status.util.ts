import type { PaymentStatus } from '@prisma/client';
import { CheckoutPaymentDisplayPhase } from '@yo-te-invito/shared';
import type { CheckoutPaymentDisplayPhase as Phase } from '@yo-te-invito/shared';
import { expectedTicketCountFromItems } from './order-fulfillment.util';
import { isOrderTicketFulfillmentComplete } from './order-fulfillment.util';
import { readPaymentReconciliationMetadata } from './getnet-reconciliation.metadata.util';

export type CheckoutStatusInput = {
  order: {
    id: string;
    eventId: string;
    status: string;
    expiresAt: Date | null;
    tenantId: string;
    orderItems: Array<{ quantity: number }>;
  };
  payment: {
    id: string;
    status: PaymentStatus;
    provider: string;
  } | null;
  paymentMetadata: unknown;
  ticketCount: number;
  urlCancelledHint?: boolean;
};

export function computeCheckoutDisplayPhase(
  input: CheckoutStatusInput,
): Phase {
  const meta = readPaymentReconciliationMetadata(input.paymentMetadata);
  const expected = expectedTicketCountFromItems(input.order.orderItems);
  const ticketsComplete = isOrderTicketFulfillmentComplete(
    input.ticketCount,
    expected,
  );

  if (
    meta.reconciliationStatus === 'REQUIRES_MANUAL_REVIEW' ||
    meta.reconciliationReason === 'ORDER_EXPIRED_PAYMENT_APPROVED' ||
    meta.reconciliationReason === 'ORDER_ALREADY_PAID_BY_ANOTHER_PAYMENT'
  ) {
    return CheckoutPaymentDisplayPhase.MANUAL_REVIEW;
  }

  if (
    input.order.status === 'EXPIRED' &&
    input.payment?.status === 'APPROVED'
  ) {
    return CheckoutPaymentDisplayPhase.MANUAL_REVIEW;
  }

  if (ticketsComplete || input.order.status === 'PAID') {
    return CheckoutPaymentDisplayPhase.APPROVED;
  }

  if (input.urlCancelledHint || input.payment?.status === 'CANCELLED') {
    return CheckoutPaymentDisplayPhase.CANCELLED;
  }

  if (input.payment?.status === 'REJECTED') {
    return CheckoutPaymentDisplayPhase.REJECTED;
  }

  if (input.order.status === 'EXPIRED') {
    return CheckoutPaymentDisplayPhase.EXPIRED;
  }

  const now = new Date();
  if (
    input.order.status === 'PENDING_PAYMENT' &&
    input.order.expiresAt &&
    input.order.expiresAt < now
  ) {
    return CheckoutPaymentDisplayPhase.EXPIRED;
  }

  if (input.payment?.status === 'APPROVED' && !ticketsComplete) {
    return CheckoutPaymentDisplayPhase.PENDING;
  }

  if (
    input.payment?.status === 'PENDING' ||
    input.payment?.status === 'CREATED' ||
    !input.payment
  ) {
    return CheckoutPaymentDisplayPhase.PENDING;
  }

  return CheckoutPaymentDisplayPhase.PENDING;
}

export function computeCheckoutCapabilities(input: {
  displayPhase: Phase;
  orderStatus: string;
  paymentProvider: string | null;
  ticketCount: number;
  eventId: string;
  tenantId: string;
  orderId: string;
}): {
  canViewTickets: boolean;
  canRetryPayment: boolean;
  canContactSupport: boolean;
  checkoutUrl: string;
} {
  const checkoutUrl = `/checkout/${encodeURIComponent(input.eventId)}?tenantId=${encodeURIComponent(input.tenantId)}&orderId=${encodeURIComponent(input.orderId)}`;

  const canViewTickets =
    input.ticketCount > 0 &&
    (input.displayPhase === CheckoutPaymentDisplayPhase.APPROVED ||
      input.orderStatus === 'PAID');

  const canRetryPayment =
    input.displayPhase === CheckoutPaymentDisplayPhase.REJECTED ||
    input.displayPhase === CheckoutPaymentDisplayPhase.CANCELLED ||
    (input.displayPhase === CheckoutPaymentDisplayPhase.EXPIRED &&
      input.orderStatus === 'PENDING_PAYMENT');

  const canContactSupport =
    input.displayPhase === CheckoutPaymentDisplayPhase.MANUAL_REVIEW;

  return { canViewTickets, canRetryPayment, canContactSupport, checkoutUrl };
}
