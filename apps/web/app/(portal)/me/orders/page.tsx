'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMyOrders } from '@/lib/query/orders';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, PageLoader, OrderCardSkeleton, EmptyState } from '@/components';
import { StatusBadge } from '@/components/domain/StatusBadge';

const TENANT_ID = 'tenant-demo';

export default function MyOrdersPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const { data: orders, isLoading } = useMyOrders(userId, TENANT_ID);

  const eventIds = [...new Set((orders ?? []).map((o) => o.eventId))];
  const eventsQuery = useQuery({
    queryKey: ['events', 'batch', eventIds],
    queryFn: async () => {
      const map: Record<string, { title: string }> = {};
      for (const id of eventIds) {
        const ev = await repos.events.getDetail(id, TENANT_ID);
        if (ev) map[id] = { title: ev.title };
      }
      return map;
    },
    enabled: eventIds.length > 0,
  });

  const eventTitles = eventsQuery.data ?? {};

  if (status === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando pedidos…" />
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión para ver tus pedidos.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/cuenta" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver a cuenta
      </Link>
      <SectionTitle>Mis pedidos</SectionTitle>

      {isLoading && (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <OrderCardSkeleton key={i} />)}
        </div>
      )}
      {!isLoading && (!orders || orders.length === 0) && (
        <div className="mt-6">
          <EmptyState
            title="No tenés pedidos aún"
            description="Tus compras aparecerán aquí."
            actionLabel="Explorar eventos"
            actionHref="/explore"
          />
        </div>
      )}
      {!isLoading && orders && orders.length > 0 && (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/me/orders/${order.id}`}
                className="block rounded-lg border border-border bg-bg-muted p-4 transition-all duration-200 hover:border-accent hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">
                      {eventTitles[order.eventId]?.title ?? `Evento ${order.eventId}`}
                    </p>
                    <p className="text-xs text-text-muted">
                      Orden {order.id} · {new Date().toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-accent font-medium">
                      ${typeof order.totalAmount === 'string' ? order.totalAmount : order.totalAmount}
                    </span>
                    <StatusBadge status={order.status} kind="order" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
