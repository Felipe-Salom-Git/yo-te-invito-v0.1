import type { Order } from '@/repositories/interfaces';

export type OrderDetailAction = {
  href: string;
  label: string;
  primary?: boolean;
};

export function countOrderItems(order: Order): number {
  if (order.orderItems?.length) {
    return order.orderItems.reduce((sum, oi) => sum + oi.quantity, 0);
  }
  return order.tickets?.length ?? 0;
}

export function normalizeOrderStatus(status: string): string {
  return status.toUpperCase();
}

export function isOrderPaid(status: string): boolean {
  const s = normalizeOrderStatus(status);
  return s === 'PAID';
}

export function isOrderPendingPayment(status: string): boolean {
  return normalizeOrderStatus(status) === 'PENDING_PAYMENT';
}

export function isOrderTerminal(status: string): boolean {
  const s = normalizeOrderStatus(status);
  return s === 'CANCELLED' || s === 'EXPIRED' || s === 'REFUNDED';
}

export function buildOrderDetailActions(
  order: Order,
  tenantId: string,
): OrderDetailAction[] {
  const status = normalizeOrderStatus(order.status);
  const eventId = order.eventId;
  const hasTickets = (order.tickets?.length ?? 0) > 0;

  if (status === 'PAID') {
    const actions: OrderDetailAction[] = [];
    if (hasTickets) {
      actions.push({ href: '/me/tickets', label: 'Ver mis tickets', primary: true });
    }
    if (eventId) {
      actions.push({
        href: `/events/${eventId}?tenantId=${encodeURIComponent(tenantId)}`,
        label: 'Ver evento',
      });
    }
    return actions;
  }

  if (status === 'PENDING_PAYMENT' && eventId) {
    return [
      {
        href: `/checkout/${eventId}?tenantId=${encodeURIComponent(tenantId)}&orderId=${encodeURIComponent(order.id)}`,
        label: 'Continuar compra',
        primary: true,
      },
      { href: '/me/cart', label: 'Volver al carrito' },
    ];
  }

  if (isOrderTerminal(order.status)) {
    return [{ href: '/explore', label: 'Explorar eventos', primary: true }];
  }

  return [{ href: '/me/orders', label: 'Volver a mis pedidos' }];
}
