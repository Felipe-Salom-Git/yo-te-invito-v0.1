import { z } from 'zod';

export const adminPaymentsListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    provider: z.enum(['DEMO', 'GETNET', 'MERCADOPAGO']).optional(),
    status: z.string().max(40).optional(),
    reconciliationStatus: z.string().max(64).optional(),
    requiresManualReview: z.coerce.boolean().optional(),
    q: z.string().max(200).optional(),
    createdFrom: z.string().datetime().optional(),
    createdTo: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (!data.createdFrom || !data.createdTo) return true;
      return new Date(data.createdFrom) <= new Date(data.createdTo);
    },
    { message: 'createdFrom must not be greater than createdTo', path: ['createdFrom'] },
  );

export type AdminPaymentsListQuery = z.infer<typeof adminPaymentsListQuerySchema>;

export const adminPaymentListItemSchema = z.object({
  id: z.string(),
  provider: z.string(),
  status: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  orderId: z.string().nullable(),
  orderStatus: z.string().nullable(),
  buyerEmail: z.string().nullable().optional(),
  eventId: z.string().nullable().optional(),
  eventTitle: z.string().nullable().optional(),
  externalReference: z.string().nullable().optional(),
  externalPaymentId: z.string().nullable().optional(),
  requiresManualReview: z.boolean(),
  reconciliationStatus: z.string().nullable().optional(),
  reconciliationReason: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AdminPaymentListItem = z.infer<typeof adminPaymentListItemSchema>;

export const adminPaymentsListResponseSchema = z.object({
  data: z.array(adminPaymentListItemSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export type AdminPaymentsListResponse = z.infer<typeof adminPaymentsListResponseSchema>;

export const adminPaymentWebhookEventSchema = z.object({
  receivedAt: z.string(),
  eventId: z.string().optional(),
  externalPaymentId: z.string().optional(),
  remoteStatus: z.string(),
  source: z.string(),
  processedOutcome: z.string(),
  payloadHash: z.string(),
  idempotencyKey: z.string(),
});

export type AdminPaymentWebhookEvent = z.infer<typeof adminPaymentWebhookEventSchema>;

export const adminPaymentOperationalMetadataSchema = z.record(z.unknown());

export const adminPaymentDetailSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  provider: z.string(),
  status: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  orderId: z.string().nullable(),
  orderStatus: z.string().nullable(),
  orderExpiresAt: z.string().datetime().nullable().optional(),
  buyerEmail: z.string().nullable().optional(),
  buyerUserId: z.string().nullable().optional(),
  eventId: z.string().nullable().optional(),
  eventTitle: z.string().nullable().optional(),
  externalReference: z.string().nullable().optional(),
  externalPaymentId: z.string().nullable().optional(),
  paymentUrl: z.string().nullable().optional(),
  requiresManualReview: z.boolean(),
  canMarkReviewed: z.boolean(),
  canReconcile: z.boolean(),
  reconciliationStatus: z.string().nullable().optional(),
  reconciliationReason: z.string().nullable().optional(),
  reconciliationSource: z.string().nullable().optional(),
  reconciliationUpdatedAt: z.string().nullable().optional(),
  reconciliationReviewedAt: z.string().nullable().optional(),
  reconciliationReviewedByUserId: z.string().nullable().optional(),
  reconciliationReviewedNote: z.string().nullable().optional(),
  lastReconciliationOutcome: z.string().nullable().optional(),
  lastReconciliationAt: z.string().nullable().optional(),
  ticketCount: z.number().int(),
  ticketsIssued: z.boolean(),
  orderItems: z.array(
    z.object({
      id: z.string(),
      ticketTypeName: z.string(),
      quantity: z.number().int(),
      unitPrice: z.string(),
    }),
  ),
  webhookEvents: z.array(adminPaymentWebhookEventSchema),
  operationalMetadata: adminPaymentOperationalMetadataSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AdminPaymentDetail = z.infer<typeof adminPaymentDetailSchema>;

export const adminPaymentParamsSchema = z.object({
  paymentId: z.string().min(1),
});

export type AdminPaymentParams = z.infer<typeof adminPaymentParamsSchema>;

export const adminPaymentReconcileResponseSchema = z.object({
  paymentId: z.string(),
  orderId: z.string(),
  outcome: z.string(),
  remoteStatus: z.string().optional(),
  localPaymentStatus: z.string().optional(),
  orderStatus: z.string().optional(),
  fulfillOutcome: z.string().optional(),
  reconciliationReason: z.string().optional(),
  message: z.string().optional(),
});

export type AdminPaymentReconcileResponse = z.infer<
  typeof adminPaymentReconcileResponseSchema
>;

export const adminPaymentMarkReviewedInputSchema = z.object({
  note: z.string().max(2000).optional(),
});

export type AdminPaymentMarkReviewedInput = z.infer<
  typeof adminPaymentMarkReviewedInputSchema
>;

export const adminPaymentMarkReviewedResponseSchema = z.object({
  paymentId: z.string(),
  reconciliationStatus: z.string(),
  reconciliationReviewedAt: z.string().datetime(),
  reconciliationReviewedByUserId: z.string(),
  reconciliationReviewedNote: z.string().nullable().optional(),
});

export type AdminPaymentMarkReviewedResponse = z.infer<
  typeof adminPaymentMarkReviewedResponseSchema
>;
