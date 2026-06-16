import { z } from 'zod';

const getnetWebCheckoutPaymentResultSchema = z
  .object({
    payment_id: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    authorization_code: z.string().optional(),
    transaction_datetime: z.string().optional(),
    return_message: z.string().optional(),
  })
  .passthrough();

const getnetWebCheckoutPaymentSchema = z
  .object({
    method: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    installment: z.unknown().optional(),
    result: getnetWebCheckoutPaymentResultSchema.optional(),
  })
  .passthrough();

function hasWebhookStatus(body: {
  status?: string;
  paymentStatus?: string;
  payment?: { result?: { status?: string } };
}): boolean {
  const root = body.status?.trim() || body.paymentStatus?.trim();
  const nested = body.payment?.result?.status?.trim();
  return !!(root || nested);
}

/**
 * Normalized Getnet webhook body (legacy GeoPagos + Web Checkout Authorization Data).
 */
export const getnetWebhookBodySchema = z
  .object({
    eventId: z.string().min(1).optional(),
    id: z.string().min(1).optional(),
    externalPaymentId: z.string().min(1).optional(),
    externalReference: z.string().min(1).optional(),
    orderId: z.string().min(1).optional(),
    order_id: z.string().min(1).optional(),
    uuid: z.string().min(1).optional(),
    /** Legacy root status — optional when Web Checkout sends payment.result.status */
    status: z.string().min(1).optional(),
    paymentStatus: z.string().min(1).optional(),
    tenantId: z.string().min(1).optional(),
    payment_intent_id: z.string().min(1).optional(),
    paymentIntentId: z.string().min(1).optional(),
    checkout_id: z.string().min(1).optional(),
    checkoutId: z.string().min(1).optional(),
    mode: z.string().optional(),
    payment: getnetWebCheckoutPaymentSchema.optional(),
  })
  .passthrough()
  .refine(hasWebhookStatus, {
    message: 'Missing status (root status or payment.result.status)',
  });

export type GetnetWebhookBody = z.infer<typeof getnetWebhookBodySchema>;

export const getnetWebhookResponseSchema = z.object({
  ok: z.boolean(),
  outcome: z.enum([
    'processed',
    'duplicate',
    'ignored',
    'payment_not_found',
    'invalid_payload',
    'unknown_status',
  ]),
  paymentId: z.string().optional(),
  orderId: z.string().optional(),
  fulfillOutcome: z
    .enum(['fulfilled', 'alreadyFulfilled', 'skipped'])
    .optional(),
  message: z.string().optional(),
});

export type GetnetWebhookResponse = z.infer<typeof getnetWebhookResponseSchema>;
