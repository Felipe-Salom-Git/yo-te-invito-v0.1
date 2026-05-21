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
  QueryError,
  useToast,
} from '@/components';
import { MeCartItemRow } from '@/components/me/MeCartItemRow';
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
  const {
    data: cart,
    isLoading: cartLoading,
    isError: cartError,
    error: cartErr,
    refetch: refetchCart,
  } = useMeCart();
  const {
    data: pending,
    isLoading: pendingLoading,
    isError: pendingError,
    error: pendingErr,
    refetch: refetchPending,
  } = useMePendingOrders();
  const { patchItem, removeItem, checkout } = useMeCartMutations();

  const createdCount = searchParams.get('created');
  const showCreatedBanner = createdCount != null && Number(createdCount) > 0;

  useEffect(() => {
    if (showCreatedBanner) {
      void refetchPending();
    }
  }, [showCreatedBanner, refetchPending]);

  const cartMutationHandlers = {
    onError: (err: unknown) => addToast(getErrorMessage(err), 'error'),
  };

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

  if (cartError || pendingError) {
    return (
      <PageContainer>
        <SectionTitle>Mi Carro</SectionTitle>
        <QueryError
          className="mt-6"
          message={getErrorMessage(cartErr ?? pendingErr)}
          onRetry={() => {
            void refetchCart();
            void refetchPending();
          }}
        />
      </PageContainer>
    );
  }

  const items = cart?.items ?? [];
  const pendingOrders = pending?.orders ?? [];
  const currency = cart?.currency ?? 'ARS';

  return (
    <PageContainer>
      <SectionTitle>Mi Carro</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        Tus entradas se guardan en la cuenta. Al confirmar, creamos un pedido por evento para pagar con
        checkout demo.{' '}
        <Link href="/me/orders" className="text-accent hover:underline">
          Ver historial de pedidos
        </Link>
        .
      </p>

      {showCreatedBanner && (
        <div
          className="mt-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-text"
          role="status"
        >
          {Number(createdCount) === 1
            ? 'Tu pedido está listo. Completá el pago en «Pagos pendientes» o desde el enlace del checkout.'
            : `Creaste ${createdCount} pedidos (uno por evento). Pagá cada uno en «Pagos pendientes» — en cualquier orden.`}
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Tu carrito está vacío"
            description="Agregá entradas desde la página del evento. Si tenés sesión iniciada, el carrito se sincroniza acá."
            actionLabel="Explorar eventos"
            actionHref="/explore"
          />
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-4">
            {items.map((item) => (
              <MeCartItemRow
                key={item.id}
                item={item}
                currency={currency}
                busy={patchItem.isPending || removeItem.isPending}
                onDecrease={() =>
                  patchItem.mutate(
                    { itemId: item.id, body: { quantity: item.quantity - 1 } },
                    cartMutationHandlers,
                  )
                }
                onIncrease={() =>
                  patchItem.mutate(
                    { itemId: item.id, body: { quantity: item.quantity + 1 } },
                    cartMutationHandlers,
                  )
                }
                onRemove={() => removeItem.mutate(item.id, cartMutationHandlers)}
              />
            ))}
          </ul>
          <div className="mt-6 rounded-lg border border-border bg-bg-muted/50 p-4">
            <p className="text-right text-lg font-semibold text-text">
              Total estimado: {currency} {cart?.subtotal}
            </p>
            <p className="mt-2 text-right text-xs text-text-muted">
              Si hay entradas de varios eventos, se creará un pedido por evento al confirmar. Si no hay
              stock, verás el error al cambiar cantidad o al confirmar.
            </p>
            <div className="mt-4 flex justify-end">
              <Button
                className="w-full sm:w-auto"
                onClick={handleCheckout}
                disabled={checkout.isPending || !tenantId}
              >
                {checkout.isPending ? 'Procesando…' : 'Confirmar y crear pedidos'}
              </Button>
            </div>
          </div>
        </>
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
        {pendingOrders.length === 0 ? (
          <EmptyState
            title="Sin pagos pendientes"
            description="Cuando confirmes el carrito, tus pedidos aparecerán acá para completar el pago demo."
          />
        ) : (
          <PendingOrdersList orders={pendingOrders} tenantId={tenantId} />
        )}
      </div>
    </PageContainer>
  );
}

export default function MeCartPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageLoader message="Cargando carrito…" />
        </PageContainer>
      }
    >
      <MeCartContent />
    </Suspense>
  );
}
