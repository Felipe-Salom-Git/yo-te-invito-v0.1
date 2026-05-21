import { z } from 'zod';

/** Matches Prisma TicketTransferOfferStatus */
export const ticketTransferOfferStatusSchema = z.enum([
  'AVAILABLE',
  'RESERVED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
]);
export type TicketTransferOfferStatus = z.infer<typeof ticketTransferOfferStatusSchema>;

/** Matches Prisma TicketStatus extensions for transfer flow */
export const ticketStatusWithTransferSchema = z.enum([
  'VALID',
  'USED',
  'REVOKED',
  'TRANSFER_PENDING',
  'TRANSFERRED',
]);
export type TicketStatusWithTransfer = z.infer<typeof ticketStatusWithTransferSchema>;

export const ticketTransferOfferSummarySchema = z.object({
  id: z.string(),
  status: ticketTransferOfferStatusSchema,
  sourceTicketId: z.string(),
  destinationTicketId: z.string().nullable(),
  sellerUserId: z.string(),
  buyerUserId: z.string().nullable(),
  acceptToken: z.string(),
  expiresAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  rejectedAt: z.string().datetime().nullable().optional(),
  message: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  sellerDisplayName: z.string().nullable().optional(),
  recipientEmail: z.string().nullable().optional(),
  event: z
    .object({
      id: z.string(),
      title: z.string(),
      startAt: z.string().datetime(),
      venueName: z.string().nullable(),
      category: z.string(),
    })
    .optional(),
});
export type TicketTransferOfferSummary = z.infer<typeof ticketTransferOfferSummarySchema>;

export const createTicketTransferOfferParamsSchema = z.object({
  ticketId: z.string().min(1),
});
export type CreateTicketTransferOfferParams = z.infer<
  typeof createTicketTransferOfferParamsSchema
>;

export const createTicketTransferOfferBodySchema = z
  .object({
    /** If set, only this user may accept or reject. */
    buyerUserId: z.string().min(1).optional(),
    /** Resolve to a registered user in the same tenant (case-insensitive). */
    recipientEmail: z.string().email().optional(),
    /** Optional note visible to the recipient. */
    message: z.string().max(500).optional(),
    expiresInHours: z.coerce.number().int().min(1).max(168).optional(),
    idempotencyKey: z.string().max(128).optional(),
  })
  .refine((data) => !(data.buyerUserId && data.recipientEmail), {
    message: 'Use either buyerUserId or recipientEmail, not both',
  });
export type CreateTicketTransferOfferBody = z.infer<typeof createTicketTransferOfferBodySchema>;

export const ticketTransferLookupParamsSchema = z.object({
  token: z.string().min(1),
});
export type TicketTransferLookupParams = z.infer<typeof ticketTransferLookupParamsSchema>;

export const ticketTransferLookupResponseSchema = z.object({
  offer: ticketTransferOfferSummarySchema,
  canAccept: z.boolean(),
  canReject: z.boolean(),
  legalNotice: z.string(),
});
export type TicketTransferLookupResponse = z.infer<typeof ticketTransferLookupResponseSchema>;

export const rejectTicketTransferOfferParamsSchema = z.object({
  offerId: z.string().min(1),
});
export type RejectTicketTransferOfferParams = z.infer<typeof rejectTicketTransferOfferParamsSchema>;

export const createTicketTransferOfferResponseSchema = z.object({
  offer: ticketTransferOfferSummarySchema,
  acceptPath: z.string(),
  message: z.string(),
});
export type CreateTicketTransferOfferResponse = z.infer<
  typeof createTicketTransferOfferResponseSchema
>;

export const acceptTicketTransferOfferParamsSchema = z.object({
  token: z.string().min(1),
});
export type AcceptTicketTransferOfferParams = z.infer<
  typeof acceptTicketTransferOfferParamsSchema
>;

export const acceptTicketTransferOfferResponseSchema = z.object({
  offer: ticketTransferOfferSummarySchema,
  destinationTicket: z.object({
    ticketId: z.string(),
    qrPayload: z.string(),
    status: ticketStatusWithTransferSchema,
    eventId: z.string(),
  }),
  message: z.string(),
});
export type AcceptTicketTransferOfferResponse = z.infer<
  typeof acceptTicketTransferOfferResponseSchema
>;

export const cancelTicketTransferOfferParamsSchema = z.object({
  offerId: z.string().min(1),
});
export type CancelTicketTransferOfferParams = z.infer<
  typeof cancelTicketTransferOfferParamsSchema
>;

export const meTicketTransferOffersQuerySchema = z.object({
  role: z.enum(['sent', 'received', 'all']).default('all'),
  status: ticketTransferOfferStatusSchema.optional(),
});
export type MeTicketTransferOffersQuery = z.infer<typeof meTicketTransferOffersQuerySchema>;

export const meTicketTransferOffersResponseSchema = z.object({
  offers: z.array(ticketTransferOfferSummarySchema),
});
export type MeTicketTransferOffersResponse = z.infer<
  typeof meTicketTransferOffersResponseSchema
>;
