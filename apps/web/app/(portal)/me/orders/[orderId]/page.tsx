'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useOrderDetail } from '@/lib/query/orders';
import { useEventDetail } from '@/lib/query/events';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { StatusBadge } from '@/components/domain/StatusBadge';

const TENANT_ID = 'tenant-demo';

export default function OrderDetailPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const orderId = (params?.orderId as string) ?? '';

  const { data: order, isLoading, error } = useOrderDetail(orderId, TENANT_ID);
  const { data: event } = useEventDetail(order?.eventId ?? '', TENANT_ID);
  const { data: tickets } = useQuery({
    queryKey: ['tickets', 'order', orderId],
    queryFn: () => repos.tickets.listByEvent(order!.eventId),
    enabled: !!order?.eventId,
  });

  const myTickets = (tickets ?? []).filter(
    (t) => (t as { orderId?: string }).orderId === orderId
  );

  if (status === 'loading') {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  if (isLoading || !orderId) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (error || !order) {
    return (
      <PageContainer>
        <p className="text-red-400">Pedido no encontrado</p>
        <Link href="/me/orders" className="mt-4 block text-accent hover:underline">
          ← Volver a mis pedidos
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/me/orders" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver a mis pedidos
      </Link>
      <SectionTitle>Pedido {order.id}</SectionTitle>

      <div className="mt-6 space-y-6">
        <div className="rounded-lg border border-border bg-bg-muted p-4">
          <h2 className="text-lg font-semibold text-text">
            {event?.title ?? `Evento ${order.eventId}`}
          </h2>
          <div className="mt-2 flex items-center gap-4 text-sm text-text-muted">
            <StatusBadge status={order.status} kind="order" />
            <span>
              ${typeof order.totalAmount === 'string' ? order.totalAmount : order.totalAmount}
            </span>
            <span>{order.buyerEmail}</span>
          </div>
        </div>

        {myTickets.length > 0 && (
          <section>
            <h3 className="text-base font-semibold text-text">Tickets emitidos</h3>
            <ul className="mt-3 space-y-2">
              {myTickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded border border-border bg-bg-muted p-3">
                  <span className="text-sm text-text">Ticket {t.id}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} kind="ticket" />
                    <Link
                      href={`/me/tickets/${t.id}`}
                      className="text-sm text-accent hover:underline"
                    >
                      Ver QR
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link
          href="/me/tickets"
          className="inline-block rounded bg-accent px-4 py-2 text-bg hover:bg-accent-hover"
        >
          Ver mis tickets
        </Link>
      </div>
    </PageContainer>
  );
}
