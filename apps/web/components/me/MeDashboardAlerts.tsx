'use client';

import Link from 'next/link';
import type { MeDashboardResponse } from '@yo-te-invito/shared';
import {
  useMeNotificationsUnread,
  useMePendingOrders,
  useMeTransferOffers,
} from '@/lib/query/me-portal';

type AlertItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
};

type Props = {
  dashboard?: MeDashboardResponse;
};

export function MeDashboardAlerts({ dashboard }: Props) {
  const { data: unread } = useMeNotificationsUnread();
  const { data: pendingOrders } = useMePendingOrders();
  const { data: incomingTransfers } = useMeTransferOffers({
    role: 'received',
    status: 'AVAILABLE',
  });

  const alerts: AlertItem[] = [];

  const unreadCount = unread?.unreadCount ?? 0;
  if (unreadCount > 0) {
    alerts.push({
      id: 'notifications',
      title: 'Notificaciones sin leer',
      description:
        unreadCount === 1
          ? 'Tenés 1 notificación nueva.'
          : `Tenés ${unreadCount} notificaciones nuevas.`,
      href: '/me/notifications',
      cta: 'Ver notificaciones',
    });
  }

  const pendingReviews = dashboard?.pendingReviews ?? [];
  if (pendingReviews.length > 0) {
    const first = pendingReviews[0]!;
    alerts.push({
      id: 'reviews',
      title: 'Experiencias por calificar',
      description:
        pendingReviews.length === 1
          ? `Podés valorar «${first.title}».`
          : `Tenés ${pendingReviews.length} experiencias pendientes de reseña.`,
      href: `/events/${first.eventId}`,
      cta: 'Calificar ahora',
    });
  }

  const upcoming = dashboard?.stats?.upcomingExperiencesCount ?? 0;
  if (upcoming > 0) {
    alerts.push({
      id: 'tickets',
      title: 'Próximas experiencias',
      description:
        upcoming === 1
          ? 'Tenés un ticket con fecha próxima.'
          : `Tenés ${upcoming} tickets con fechas próximas.`,
      href: '/me/tickets',
      cta: 'Ver mis tickets',
    });
  }

  const transferCount = incomingTransfers?.offers?.length ?? 0;
  if (transferCount > 0) {
    alerts.push({
      id: 'transfers',
      title: 'Transferencias pendientes',
      description:
        transferCount === 1
          ? 'Hay una entrada esperando tu respuesta.'
          : `Hay ${transferCount} transferencias esperando tu respuesta.`,
      href: '/me/activity?tab=transfers',
      cta: 'Revisar transferencia',
    });
  }

  const orderCount = pendingOrders?.orders?.length ?? 0;
  if (orderCount > 0) {
    alerts.push({
      id: 'orders',
      title: 'Pedidos pendientes',
      description:
        orderCount === 1
          ? 'Completá el pago de un pedido en curso.'
          : `Tenés ${orderCount} pedidos pendientes de pago.`,
      href: '/me/cart',
      cta: 'Ver Mi Carro',
    });
  }

  if (dashboard?.cartSummary.hasItems && orderCount === 0) {
    alerts.push({
      id: 'cart',
      title: 'Mi Carro con ítems',
      description: `Tenés ${dashboard.cartSummary.itemCount} ítem${
        dashboard.cartSummary.itemCount === 1 ? '' : 's'
      } listos para checkout.`,
      href: '/me/cart',
      cta: 'Ver Mi Carro',
    });
  }

  if (alerts.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="me-alerts-heading">
      <h3 id="me-alerts-heading" className="text-lg font-semibold text-text">
        Alertas importantes
      </h3>
      <ul className="mt-3 space-y-3">
        {alerts.map((a) => (
          <li
            key={a.id}
            className="flex flex-col gap-3 rounded-lg border border-accent/30 bg-bg-muted p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-text">{a.title}</p>
              <p className="mt-0.5 text-sm text-text-muted">{a.description}</p>
            </div>
            <Link
              href={a.href}
              className="shrink-0 text-sm font-medium text-accent hover:underline"
            >
              {a.cta} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
