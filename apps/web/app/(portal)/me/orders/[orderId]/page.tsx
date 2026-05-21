'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useOrderDetail, useOrderPaymentStatus } from '@/lib/query/orders';
import { useEventDetail } from '@/lib/query/events';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  QueryError,
  EmptyState,
} from '@/components';
import { PortalListSection } from '@/components/me/portal-ui';
import { MeOrderDetailSummary } from '@/components/me/MeOrderDetailSummary';
import { MeOrderItemRow } from '@/components/me/MeOrderItemRow';
import { MeOrderTicketsList } from '@/components/me/MeOrderTicketsList';
import { MeOrderDetailActions } from '@/components/me/MeOrderDetailActions';
import { getErrorMessage } from '@/lib/errors';
import { isOrderPaid } from '@/lib/me/order-detail';

const TENANT_ID = 'tenant-demo';

export default function OrderDetailPage() {
  const params = useParams();
  const { data: session, status: sessionStatus } = useSession();
  const orderId = (params?.orderId as string) ?? '';

  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrderDetail(orderId, TENANT_ID, {
    enabled: sessionStatus === 'authenticated' && !!orderId,
  });

  const { data: payment } = useOrderPaymentStatus(orderId, TENANT_ID, {
    enabled: sessionStatus === 'authenticated' && !!orderId && !!order,
  });

  const { data: event } = useEventDetail(order?.eventId ?? '', TENANT_ID);

  if (sessionStatus === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando sesión…" />
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión para ver este pedido.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  if (!orderId) {
    return (
      <PageContainer>
        <EmptyState
          title="Pedido no válido"
          description="El enlace no incluye un identificador de pedido."
          actionLabel="Mis pedidos"
          actionHref="/me/orders"
        />
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando pedido…" />
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <Link
          href="/me/orders"
          className="mb-4 inline-block text-sm text-text-muted hover:text-text"
        >
          ← Mis pedidos
        </Link>
        <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  if (!order) {
    return (
      <PageContainer>
        <EmptyState
          title="Pedido no encontrado"
          description="No existe o no tenés permiso para verlo."
          actionLabel="Volver a mis pedidos"
          actionHref="/me/orders"
        />
      </PageContainer>
    );
  }

  const currency = order.currency ?? 'ARS';
  const lineItems = order.orderItems ?? [];
  const tickets = order.tickets ?? [];
  const paid = isOrderPaid(order.status);

  return (
    <PageContainer>
      <Link
        href="/me/orders"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Mis pedidos
      </Link>

      <SectionTitle>Detalle del pedido</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        {paid
          ? 'Compra confirmada. Tus entradas están en Mis tickets.'
          : 'Revisá el estado y completá el pago si el pedido sigue pendiente.'}
      </p>

      <div className="mt-6 space-y-8">
        <MeOrderDetailSummary
          order={order}
          event={
            event
              ? {
                  title: event.title,
                  startAt: event.startAt,
                  venueName: event.venueName,
                }
              : null
          }
          paymentStatus={payment?.status ?? null}
        />

        <MeOrderDetailActions order={order} tenantId={TENANT_ID} />

        {lineItems.length > 0 ? (
          <PortalListSection title="Ítems del pedido" description={`${lineItems.length} línea(s)`}>
            <ul className="space-y-3">
              {lineItems.map((item) => (
                <MeOrderItemRow key={item.id} item={item} currency={currency} />
              ))}
            </ul>
          </PortalListSection>
        ) : (
          <EmptyState
            title="Sin ítems en el pedido"
            description="Este pedido no tiene líneas de compra registradas."
            actionLabel="Mis pedidos"
            actionHref="/me/orders"
          />
        )}

        {paid && <MeOrderTicketsList tickets={tickets} />}
      </div>
    </PageContainer>
  );
}
