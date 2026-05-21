import { z } from 'zod';
import { TicketRevocationReason } from '../enums';

// Prisma-compatible enums (uppercase) - internal to schemas, not re-exported to avoid conflict with ./enums
const TicketTypeStatus = { ACTIVE: 'ACTIVE', PAUSED: 'PAUSED' } as const;

/** Child tanda / tier within a base TicketType (matches Prisma TicketBatchStatus). */
export const TicketBatchStatusApi = {
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  SOLD_OUT: 'SOLD_OUT',
  SKIPPED: 'SKIPPED',
} as const;
export type TicketBatchStatusApi =
  (typeof TicketBatchStatusApi)[keyof typeof TicketBatchStatusApi];
const OrderStatusApi = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  REFUNDED: 'REFUNDED',
} as const;
const TicketStatusApi = {
  VALID: 'VALID',
  USED: 'USED',
  REVOKED: 'REVOKED',
} as const;

export const ticketTypesQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
});
export type TicketTypesQuery = z.infer<typeof ticketTypesQuerySchema>;

export const orderDetailsQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
});
export type OrderDetailsQuery = z.infer<typeof orderDetailsQuerySchema>;

export const createOrderBuyerSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  document: z.string().optional(),
});

export const createOrderItemSchema = z.object({
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1),
});

export const createOrderDtoSchema = z.object({
  eventId: z.string().min(1),
  buyer: createOrderBuyerSchema,
  items: z.array(createOrderItemSchema).min(1),
  referralCode: z.string().optional(),
  /** Logged-in buyer; must match buyer.email (case-insensitive) for the same tenant. */
  buyerUserId: z.string().min(1).optional(),
});
export type CreateOrderDto = z.infer<typeof createOrderDtoSchema>;

export const ticketBatchResponseSchema = z.object({
  id: z.string(),
  ticketTypeId: z.string(),
  orderIndex: z.number().int(),
  name: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  baseQuantity: z.number().int(),
  rolloverQuantity: z.number().int(),
  effectiveQuantity: z.number().int(),
  reservedQuantity: z.number().int(),
  soldCount: z.number().int(),
  price: z.string(),
  currency: z.string(),
  status: z.nativeEnum(TicketBatchStatusApi),
});
export type TicketBatchResponse = z.infer<typeof ticketBatchResponseSchema>;

export const ticketTypeResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.string(),
  currency: z.string(),
  capacityTotal: z.number(),
  capacityAvailable: z.number(),
  maxPerOrder: z.number(),
  salesStartAt: z.string().datetime().nullable(),
  salesEndAt: z.string().datetime().nullable(),
  status: z.nativeEnum(TicketTypeStatus),
  /** Present when API includes batch detail (producer list / extended public). */
  batches: z.array(ticketBatchResponseSchema).optional(),
  /** Selling window / price source for checkout when batches exist. */
  activeTicketBatchId: z.string().nullable().optional(),
  /** Set when a custom TicketTemplate is linked (canvas studio). */
  ticketTemplateId: z.string().nullable().optional(),
});
export type TicketTypeResponse = z.infer<typeof ticketTypeResponseSchema>;

/** Input tanda row for create/update ticket type (producer). */
export const ticketBatchInputSchema = z.object({
  orderIndex: z.number().int().min(0),
  name: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  baseQuantity: z.number().int().min(0),
  price: z.number().nonnegative(),
});

export const createTicketTypeDtoSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    /** Required when `batches` is omitted; when batches are set, defaults to first batch price server-side if omitted. */
    price: z.number().nonnegative().optional(),
    capacityTotal: z.number().int().min(1),
    currency: z.string().default('ARS'),
    maxPerOrder: z.number().int().min(1).max(100).default(10),
    salesStartAt: z.string().datetime().optional().nullable(),
    salesEndAt: z.string().datetime().optional().nullable(),
    /** When set, sum of baseQuantity must equal capacityTotal; defines chained tandas. */
    batches: z.array(ticketBatchInputSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.batches?.length && data.price === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'price is required when batches are omitted',
        path: ['price'],
      });
    }
    if (!data.batches?.length) return;
    const sum = data.batches.reduce((s, b) => s + b.baseQuantity, 0);
    if (sum !== data.capacityTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sum of batch baseQuantity must equal capacityTotal',
        path: ['batches'],
      });
    }
    const idx = data.batches.map((b) => b.orderIndex);
    if (new Set(idx).size !== idx.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'orderIndex values must be unique',
        path: ['batches'],
      });
    }
    for (const b of data.batches) {
      if (new Date(b.endAt) <= new Date(b.startAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'each batch endAt must be after startAt',
          path: ['batches'],
        });
      }
    }
  });
export type CreateTicketTypeDto = z.infer<typeof createTicketTypeDtoSchema>;
export type TicketBatchInput = z.infer<typeof ticketBatchInputSchema>;

/** Body for PATCH /producer/events/:eventId/ticket-types/:id */
export const updateTicketTypeDtoSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    price: z.number().nonnegative().optional(),
    capacityTotal: z.number().int().min(0).optional(),
    maxPerOrder: z.number().int().min(1).max(100).optional(),
    salesStartAt: z.string().datetime().optional().nullable(),
    salesEndAt: z.string().datetime().optional().nullable(),
    status: z.nativeEnum(TicketTypeStatus).optional(),
    /** Replaces all batches only when no order items exist for this type. */
    batches: z.array(ticketBatchInputSchema).min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.batches?.length) return;
    const sum = data.batches.reduce((s, b) => s + b.baseQuantity, 0);
    if (data.capacityTotal !== undefined && sum !== data.capacityTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sum of batch baseQuantity must equal capacityTotal',
        path: ['batches'],
      });
    }
    const idx = data.batches.map((b) => b.orderIndex);
    if (new Set(idx).size !== idx.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'orderIndex values must be unique',
        path: ['batches'],
      });
    }
    for (const b of data.batches) {
      if (new Date(b.endAt) <= new Date(b.startAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'each batch endAt must be after startAt',
          path: ['batches'],
        });
      }
    }
  });
export type UpdateTicketTypeDto = z.infer<typeof updateTicketTypeDtoSchema>;

export const ticketResponseSchema = z.object({
  id: z.string(),
  ticketTypeId: z.string().nullable(),
  ticketBatchId: z.string().nullable().optional(),
  ticketTypeName: z.string().nullable(),
  qrPayload: z.string(),
  status: z.nativeEnum(TicketStatusApi),
});
export type TicketResponse = z.infer<typeof ticketResponseSchema>;

export const orderItemResponseSchema = z.object({
  id: z.string(),
  ticketTypeId: z.string(),
  ticketBatchId: z.string().nullable().optional(),
  ticketTypeName: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  subtotal: z.string(),
  tickets: z.array(ticketResponseSchema),
});
export type OrderItemResponse = z.infer<typeof orderItemResponseSchema>;

// Ticket revocation
export const revokeTicketParamsSchema = z.object({
  ticketId: z.string().min(1, 'ticketId is required'),
});
export type RevokeTicketParams = z.infer<typeof revokeTicketParamsSchema>;

export const revokeTicketBodySchema = z.object({
  reason: z.nativeEnum(TicketRevocationReason),
  note: z.string().max(500).optional(),
  idempotencyKey: z.string().max(128).optional(),
});
export type RevokeTicketBody = z.infer<typeof revokeTicketBodySchema>;

// Ticket transfer
export const transferTicketParamsSchema = z.object({
  ticketId: z.string().min(1, 'ticketId is required'),
});
export type TransferTicketParams = z.infer<typeof transferTicketParamsSchema>;

export const transferTicketBodySchema = z.object({
  toUserId: z.string().min(1, 'toUserId is required'),
  idempotencyKey: z.string().max(128).optional(),
});
export type TransferTicketBody = z.infer<typeof transferTicketBodySchema>;

export const transferTicketResponseSchema = z.object({
  ticketId: z.string(),
  fromUserId: z.string(),
  toUserId: z.string(),
  transferredAt: z.string().datetime(),
  message: z.string(),
});
export type TransferTicketResponse = z.infer<typeof transferTicketResponseSchema>;

export const revokeTicketResponseSchema = z.object({
  ticketId: z.string(),
  status: z.literal('REVOKED'),
  revokedAt: z.string().datetime(),
  reason: z.nativeEnum(TicketRevocationReason),
  message: z.string(),
});
export type RevokeTicketResponse = z.infer<typeof revokeTicketResponseSchema>;

export const orderResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  tenantId: z.string(),
  status: z.nativeEnum(OrderStatusApi),
  buyerEmail: z.string(),
  buyerFirstName: z.string(),
  buyerLastName: z.string(),
  buyerDocument: z.string().nullable(),
  totalAmount: z.string(),
  currency: z.string(),
  orderItems: z.array(orderItemResponseSchema),
  tickets: z.array(ticketResponseSchema),
  createdAt: z.string().datetime(),
});
export type OrderResponse = z.infer<typeof orderResponseSchema>;
