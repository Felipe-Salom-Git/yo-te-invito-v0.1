'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useMyOrders } from '@/lib/query/orders';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  OrderCardSkeleton,
  EmptyState,
  QueryError,
} from '@/components';
import { StatusBadge } from '@/components/domain/StatusBadge';
import { getErrorMessage } from '@/lib/errors';

const TENANT_ID = 'tenant-demo';

export default function MyOrdersPage() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const userId =
    (session?.user as { userId?: string })?.userId ??
    (session?.user as { id?: string })?.id ??
    '';

  const { data: orders, isLoading, isError, error, refetch } = useMyOrders(userId, TENANT_ID);

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
      <SectionTitle>Mis pedidos</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Historial de compras. Los pedidos pendientes de pago también están en{' '}
        <Link href="/me/cart" className="text-accent hover:underline">
          Mi Carro
        </Link>
        .
      </p>

      {isLoading && (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <OrderCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && (
        <QueryError
          className="mt-6"
          message={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      )}

      {!isLoading && !isError && (!orders || orders.length === 0) && (
        <div className="mt-6">
          <EmptyState
            title="No tenés pedidos aún"
            description="Tus compras aparecerán aquí después del checkout."
            actionLabel="Explorar eventos"
            actionHref="/explore"
          />
        </div>
      )}

      {!isLoading && !isError && orders && orders.length > 0 && (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/me/orders/${order.id}`}
                className="block rounded-lg border border-border bg-bg-muted p-4 transition-colors hover:border-accent/50"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-text">
                      {eventTitles[order.eventId]?.title ?? `Evento ${order.eventId}`}
                    </p>
                    <p className="text-xs text-text-muted break-all">
                      Orden {order.id.slice(0, 8)}…
                      {typeof order.createdAt === 'string'
                        ? ` · ${new Date(order.createdAt).toLocaleDateString('es-AR')}`
                        : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span className="font-medium text-accent tabular-nums">
                      $
                      {typeof order.totalAmount === 'string'
                        ? order.totalAmount
                        : order.totalAmount}
                    </span>
                    <StatusBadge status={order.status} kind="order" />
                    <span className="w-full text-sm text-accent sm:w-auto">Ver detalle →</span>
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
