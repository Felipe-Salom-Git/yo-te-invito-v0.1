import type { OrderResponse } from '@yo-te-invito/shared';

/** Maps Prisma order + relations to shared `OrderResponse`. */
export function mapOrderToResponse(order: {
  id: string;
  tenantId: string;
  eventId: string;
  status: string;
  buyerEmail: string;
  buyerFirstName: string;
  buyerLastName: string;
  buyerDocument: string | null;
  totalAmount: { toString: () => string };
  currency: string;
  createdAt: Date;
  orderItems: Array<{
    id: string;
    ticketTypeId: string;
    ticketBatchId: string | null;
    ticketType: { name: string };
    quantity: number;
    unitPrice: { toString: () => string };
    subtotal: { toString: () => string };
    tickets: Array<{
      id: string;
      ticketTypeId: string | null;
      ticketBatchId: string | null;
      qrPayload: string;
      status: string;
    }>;
  }>;
  tickets: Array<{
    id: string;
    ticketTypeId: string | null;
    ticketBatchId: string | null;
    orderItemId: string | null;
    qrPayload: string;
    status: string;
  }>;
}): OrderResponse {
  const orderItems = order.orderItems.map((oi) => ({
    id: oi.id,
    ticketTypeId: oi.ticketTypeId,
    ticketBatchId: oi.ticketBatchId ?? undefined,
    ticketTypeName: oi.ticketType.name,
    quantity: oi.quantity,
    unitPrice: oi.unitPrice.toString(),
    subtotal: oi.subtotal.toString(),
    tickets: oi.tickets.map((t) => ({
      id: t.id,
      ticketTypeId: t.ticketTypeId ?? oi.ticketTypeId,
      ticketBatchId: t.ticketBatchId ?? oi.ticketBatchId ?? undefined,
      ticketTypeName: oi.ticketType.name,
      qrPayload: t.qrPayload,
      status: t.status as 'VALID' | 'USED' | 'REVOKED',
    })),
  }));

  const tickets = order.tickets
    .filter((t) => t.orderItemId)
    .map((t) => {
      const oi = order.orderItems.find((o) => o.id === t.orderItemId!);
      return {
        id: t.id,
        ticketTypeId: t.ticketTypeId ?? oi?.ticketTypeId ?? null,
        ticketBatchId: t.ticketBatchId ?? oi?.ticketBatchId ?? undefined,
        ticketTypeName: oi?.ticketType.name ?? null,
        qrPayload: t.qrPayload,
        status: t.status as 'VALID' | 'USED' | 'REVOKED',
      };
    });

  return {
    id: order.id,
    tenantId: order.tenantId,
    eventId: order.eventId,
    status: order.status as OrderResponse['status'],
    buyerEmail: order.buyerEmail,
    buyerFirstName: order.buyerFirstName,
    buyerLastName: order.buyerLastName,
    buyerDocument: order.buyerDocument,
    totalAmount: order.totalAmount.toString(),
    currency: order.currency,
    orderItems,
    tickets,
    createdAt: order.createdAt.toISOString(),
  };
}
