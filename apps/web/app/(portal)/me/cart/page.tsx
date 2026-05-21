'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  PageContainer,
  SectionTitle,
  Button,
  PageLoader,
  EmptyState,
  useToast,
} from '@/components';
import { PendingOrdersList } from '@/components/me/PendingOrdersList';
import {
  useMeCart,
  useMeCartMutations,
  useMePendingOrders,
} from '@/lib/query/me-portal';
import { useTenant } from '@/hooks/useTenant';
import { getErrorMessage } from '@/lib/errors';
import { getReferralCode } from '@/lib/referral-cookie';

function MeCartContent() {
  const { tenantId } = useTenant();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { data: cart, isLoading: cartLoading } = useMeCart();
  const { data: pending, isLoading: pendingLoading, refetch: refetchPending } = useMePendingOrders();
  const { patchItem, removeItem, checkout } = useMeCartMutations();

  const createdCount = searchParams.get('created');
  const showCreatedBanner = createdCount != null && Number(createdCount) > 0;

  useEffect(() => {
    if (showCreatedBanner) {
      refetchPending();
    }
  }, [showCreatedBanner, refetchPending]);

  const handleCheckout = () => {
    if (!tenantId) return;
    checkout.mutate(
      { tenantId, referralCode: getReferralCode() || undefined },
      {
        onSuccess: async (res) => {
          const n = res.orderIds.length;
          addToast(
            n === 1
              ? 'Pedido creado. Completá el pago.'
              : `Se crearon ${n} pedidos (uno por evento). Completá cada pago abajo.`,
            'success',
          );
          const { data: refreshed } = await refetchPending();
          if (n === 1) {
            const order =
              refreshed?.orders.find((o) => o.id === res.orderIds[0]) ??
              refreshed?.orders[0];
            if (order?.eventId) {
              router.push(
                `/checkout/${order.eventId}?tenantId=${encodeURIComponent(tenantId)}&orderId=${encodeURIComponent(order.id)}`,
              );
              return;
            }
          }
          router.replace(`/me/cart?created=${n}`);
        },
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  if (cartLoading || pendingLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando carrito…" />
      </PageContainer>
    );
  }

  const items = cart?.items ?? [];
  const pendingOrders = pending?.orders ?? [];

  return (
    <PageContainer>
      <SectionTitle>Carrito</SectionTitle>

      {showCreatedBanner && (
        <div className="mt-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-text">
          {Number(createdCount) === 1
            ? 'Tu pedido está listo. Completá el pago en la sección de abajo o desde el enlace que te mostramos.'
            : `Creaste ${createdCount} pedidos (uno por evento). Pagá cada uno en «Pagos pendientes» — podés hacerlo en cualquier orden.`}
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Tu carrito está vacío"
            description="Agregá entradas desde la página del evento."
            actionLabel="Explorar eventos"
            actionHref="/explore"
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium text-text">{item.eventTitle ?? item.eventId}</p>
                <p className="text-sm text-text-muted">
                  {item.ticketTypeName ?? item.ticketTypeId} · ${item.unitPrice} × {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={patchItem.isPending || item.quantity <= 1}
                  onClick={() =>
                    patchItem.mutate({ itemId: item.id, body: { quantity: item.quantity - 1 } })
                  }
                >
                  −
                </Button>
                <span className="w-8 text-center text-sm">{item.quantity}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={patchItem.isPending}
                  onClick={() =>
                    patchItem.mutate({ itemId: item.id, body: { quantity: item.quantity + 1 } })
                  }
                >
                  +
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={removeItem.isPending}
                  onClick={() => removeItem.mutate(item.id)}
                >
                  Quitar
                </Button>
              </div>
            </li>
          ))}
          <p className="text-right font-medium text-text">
            Subtotal: {cart?.currency ?? 'ARS'} {cart?.subtotal}
          </p>
          <p className="text-right text-xs text-text-muted">
            Si hay entradas de varios eventos, se creará un pedido por evento al confirmar.
          </p>
          <Button onClick={handleCheckout} disabled={checkout.isPending || !tenantId}>
            {checkout.isPending ? 'Procesando…' : 'Confirmar y crear pedidos'}
          </Button>
        </ul>
      )}

      <SectionTitle className="mt-12">Pagos pendientes</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Cada pedido se paga por separado. Cuando termines, tus tickets aparecen en{' '}
        <Link href="/me/tickets" className="text-accent hover:underline">
          Mis tickets
        </Link>
        .
      </p>
      <div className="mt-4">
        <PendingOrdersList orders={pendingOrders} tenantId={tenantId} />
      </div>
    </PageContainer>
  );
}

export default function MeCartPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <PageLoader message="Cargando carrito…" />
      </PageContainer>
    }>
      <MeCartContent />
    </Suspense>
  );
}
