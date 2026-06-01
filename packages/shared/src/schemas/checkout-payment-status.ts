import { z } from 'zod';

export const CheckoutPaymentDisplayPhase = {
  APPROVED: 'approved',
  PENDING: 'pending',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  MANUAL_REVIEW: 'manual_review',
} as const;

export type CheckoutPaymentDisplayPhase =
  (typeof CheckoutPaymentDisplayPhase)[keyof typeof CheckoutPaymentDisplayPhase];

export const checkoutPaymentStatusQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  paymentId: z.string().min(1).optional(),
  /** Hint from return URL when user cancelled at Getnet (not authoritative). */
  cancelled: z
    .union([z.literal('1'), z.literal('true'), z.literal('0'), z.literal('false')])
    .optional(),
});
export type CheckoutPaymentStatusQuery = z.infer<
  typeof checkoutPaymentStatusQuerySchema
>;

export const checkoutPaymentStatusParamsSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
});
export type CheckoutPaymentStatusParams = z.infer<
  typeof checkoutPaymentStatusParamsSchema
>;

export const refreshPaymentStatusPostParamsSchema = z.object({
  paymentId: z.string().min(1, 'paymentId is required'),
});
export type RefreshPaymentStatusPostParams = z.infer<
  typeof refreshPaymentStatusPostParamsSchema
>;

export const refreshPaymentStatusPostQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
});
export type RefreshPaymentStatusPostQuery = z.infer<
  typeof refreshPaymentStatusPostQuerySchema
>;

export const checkoutPaymentStatusResponseSchema = z.object({
  orderId: z.string(),
  eventId: z.string(),
  orderStatus: z.string(),
  paymentId: z.string().nullable(),
  paymentProvider: z.enum(['DEMO', 'MERCADOPAGO', 'GETNET']).nullable(),
  paymentStatus: z.string().nullable(),
  displayPhase: z.enum([
    CheckoutPaymentDisplayPhase.APPROVED,
    CheckoutPaymentDisplayPhase.PENDING,
    CheckoutPaymentDisplayPhase.REJECTED,
    CheckoutPaymentDisplayPhase.CANCELLED,
    CheckoutPaymentDisplayPhase.EXPIRED,
    CheckoutPaymentDisplayPhase.MANUAL_REVIEW,
  ]),
  requiresManualReview: z.boolean(),
  reconciliationReason: z.string().optional(),
  ticketsIssued: z.boolean(),
  ticketCount: z.number().int(),
  canViewTickets: z.boolean(),
  canRetryPayment: z.boolean(),
  canContactSupport: z.boolean(),
  checkoutUrl: z.string().optional(),
  returnUrl: z.string().optional(),
});

export type CheckoutPaymentStatusResponse = z.infer<
  typeof checkoutPaymentStatusResponseSchema
>;
