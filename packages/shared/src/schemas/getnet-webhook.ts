import { z } from 'zod';

/**
 * Normalized Getnet webhook body (flexible aliases for provider payloads).
 * Adjust when official Getnet webhook schema is confirmed.
 */
export const getnetWebhookBodySchema = z
  .object({
    eventId: z.string().min(1).optional(),
    id: z.string().min(1).optional(),
    externalPaymentId: z.string().min(1).optional(),
    externalReference: z.string().min(1).optional(),
    orderId: z.string().min(1).optional(),
    uuid: z.string().min(1).optional(),
    status: z.string().min(1),
    paymentStatus: z.string().min(1).optional(),
    tenantId: z.string().min(1).optional(),
  })
  .passthrough();

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
