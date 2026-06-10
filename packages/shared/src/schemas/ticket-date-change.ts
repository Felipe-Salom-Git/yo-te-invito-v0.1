import { z } from 'zod';
import {
  TICKET_DATE_CHANGE_BLOCK_REASON,
  type TicketDateChangeBlockReason,
} from '../constants/ticket-date-change';

export const ticketDateChangeRequestStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'APPLIED',
  'CANCELLED',
]);
export type TicketDateChangeRequestStatus = z.infer<typeof ticketDateChangeRequestStatusSchema>;

export const ticketDateChangeBlockReasonSchema = z.enum(
  Object.values(TICKET_DATE_CHANGE_BLOCK_REASON) as [
    TicketDateChangeBlockReason,
    ...TicketDateChangeBlockReason[],
  ],
);

export const ticketDateChangeOccurrenceOptionSchema = z.object({
  occurrenceId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable(),
  venueName: z.string().nullable(),
  ticketTypeId: z.string(),
  ticketTypeName: z.string(),
  price: z.string(),
  capacityAvailable: z.number().int(),
});
export type TicketDateChangeOccurrenceOption = z.infer<
  typeof ticketDateChangeOccurrenceOptionSchema
>;

export const ticketDateChangeEligibilitySchema = z.object({
  canRequest: z.boolean(),
  reasons: z.array(z.string()),
  currentOccurrenceId: z.string().nullable(),
  currentOccurrenceStartAt: z.string().datetime().nullable(),
  availableOccurrences: z.array(ticketDateChangeOccurrenceOptionSchema),
  requiresApproval: z.boolean().optional(),
  windowHours: z.number().int(),
});
export type TicketDateChangeEligibility = z.infer<typeof ticketDateChangeEligibilitySchema>;

export const createTicketDateChangeRequestParamsSchema = z.object({
  ticketId: z.string().min(1),
});
export type CreateTicketDateChangeRequestParams = z.infer<
  typeof createTicketDateChangeRequestParamsSchema
>;

export const createTicketDateChangeRequestBodySchema = z.object({
  toOccurrenceId: z.string().min(1),
  message: z.string().max(500).optional(),
});
export type CreateTicketDateChangeRequestBody = z.infer<
  typeof createTicketDateChangeRequestBodySchema
>;

export const ticketDateChangeRequestResponseSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  status: ticketDateChangeRequestStatusSchema,
  fromOccurrenceId: z.string(),
  toOccurrenceId: z.string(),
  fromOccurrenceStartAt: z.string().datetime(),
  toOccurrenceStartAt: z.string().datetime(),
  message: z.string().nullable(),
  rejectReason: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  appliedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  autoApproved: z.boolean().optional(),
});
export type TicketDateChangeRequestResponse = z.infer<
  typeof ticketDateChangeRequestResponseSchema
>;

export const ticketDateChangeHistoryItemSchema = z.object({
  id: z.string(),
  status: ticketDateChangeRequestStatusSchema,
  fromOccurrenceId: z.string(),
  toOccurrenceId: z.string(),
  fromOccurrenceStartAt: z.string().datetime(),
  toOccurrenceStartAt: z.string().datetime(),
  message: z.string().nullable(),
  rejectReason: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  appliedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type TicketDateChangeHistoryItem = z.infer<typeof ticketDateChangeHistoryItemSchema>;

export const ticketDateChangeOptionsParamsSchema = z.object({
  ticketId: z.string().min(1),
});
export type TicketDateChangeOptionsParams = z.infer<typeof ticketDateChangeOptionsParamsSchema>;

export const producerTicketDateChangeListQuerySchema = z.object({
  status: ticketDateChangeRequestStatusSchema.optional(),
});
export type ProducerTicketDateChangeListQuery = z.infer<
  typeof producerTicketDateChangeListQuerySchema
>;

export const producerTicketDateChangeListItemSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  status: ticketDateChangeRequestStatusSchema,
  buyerName: z.string().nullable(),
  buyerEmail: z.string().nullable(),
  ticketTypeName: z.string().nullable(),
  fromOccurrenceStartAt: z.string().datetime(),
  toOccurrenceStartAt: z.string().datetime(),
  message: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ProducerTicketDateChangeListItem = z.infer<
  typeof producerTicketDateChangeListItemSchema
>;

export const rejectTicketDateChangeBodySchema = z.object({
  reason: z.string().max(500).optional(),
});
export type RejectTicketDateChangeBody = z.infer<typeof rejectTicketDateChangeBodySchema>;
