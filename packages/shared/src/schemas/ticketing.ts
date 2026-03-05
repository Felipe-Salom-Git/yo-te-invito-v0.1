import { z } from 'zod';

export const TicketTypeStatus = { ACTIVE: 'ACTIVE', PAUSED: 'PAUSED' } as const;
export type TicketTypeStatus = (typeof TicketTypeStatus)[keyof typeof TicketTypeStatus];

export const OrderStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const TicketStatus = {
  VALID: 'VALID',
  USED: 'USED',
  REVOKED: 'REVOKED',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

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
});
export type CreateOrderDto = z.infer<typeof createOrderDtoSchema>;

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
});
export type TicketTypeResponse = z.infer<typeof ticketTypeResponseSchema>;

export const ticketResponseSchema = z.object({
  id: z.string(),
  ticketTypeId: z.string(),
  ticketTypeName: z.string(),
  qrPayload: z.string(),
  status: z.nativeEnum(TicketStatus),
});
export type TicketResponse = z.infer<typeof ticketResponseSchema>;

export const orderItemResponseSchema = z.object({
  id: z.string(),
  ticketTypeId: z.string(),
  ticketTypeName: z.string(),
  quantity: z.number(),
  unitPrice: z.string(),
  subtotal: z.string(),
  tickets: z.array(ticketResponseSchema),
});
export type OrderItemResponse = z.infer<typeof orderItemResponseSchema>;

export const orderResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  status: z.nativeEnum(OrderStatus),
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
