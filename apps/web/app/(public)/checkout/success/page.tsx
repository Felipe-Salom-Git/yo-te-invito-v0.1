'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { PageContainer, SectionTitle, Button, PageLoader } from '@/components';
import { PendingOrdersList } from '@/components/me/PendingOrdersList';
import type { MePendingOrdersResponse } from '@yo-te-invito/shared';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderIdsParam = searchParams?.get('orderIds') ?? searchParams?.get('orderId') ?? '';
  const orderIds = orderIdsParam ? orderIdsParam.split(',').filter(Boolean) : [];
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId ?? 'tenant-demo';
  const userId =
    (session?.user as { userId?: string })?.userId ??
    (session?.user as { id?: string })?.id ??
    '';
  const isAuthed = status === 'authenticated' && !!session?.user;

  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: orderRows, isLoading: ordersLoading } = useQuery({
    queryKey: ['checkout-success', 'orders', t, orderIds.join('|')],
    queryFn: async (): Promise<MePendingOrdersResponse['orders']> => {
      const rows: MePendingOrdersResponse['orders'] = [];
      for (const oid of orderIds) {
        const order = await repos.orders.get(oid, t);
        if (!order) continue;
        rows.push({
          id: order.id,
          eventId: order.eventId,
          status: order.status,
          buyerEmail: String(order.buyerEmail ?? ''),
          totalAmount: String(order.totalAmount ?? '0'),
          currency: 'ARS',
          createdAt: new Date().toISOString(),
          eventTitle: undefined,
        });
      }
      return rows;
    },
    enabled: orderIds.length > 0,
  });

  const checkPaid = async () => {
    for (const oid of orderIds) {
      const statusRes = await repos.orders.getOrderPaymentStatus(oid, t);
      if (statusRes.orderStatus === 'PAID' || statusRes.orderStatus === 'paid') {
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    if (orderIds.length === 0) return;
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      setError(null);
      try {
        if (!cancelled && (await checkPaid())) setPaid(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al verificar');
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderIds.join(',')]);

  const handlePayDemo = async () => {
    if (orderIds.length === 0) {
      setError('No hay órdenes para pagar');
      return;
    }
    if (!userId) {
      setError('Iniciá sesión para pagar y recibir tus tickets');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      for (const oid of orderIds) {
        await repos.orders.confirmDemoPayment(oid, t);
      }
      setPaid(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (orderIds.length === 0) return;
    setRefreshing(true);
    setError(null);
    try {
      if (await checkPaid()) setPaid(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar');
    } finally {
      setRefreshing(false);
    }
  };

  if (orderIds.length === 0) {
    return (
      <PageContainer>
        <p className="text-text-muted">Orden no encontrada</p>
        <Link href="/home" className="mt-4 block text-accent hover:underline">
          ← Volver
        </Link>
      </PageContainer>
    );
  }

  if (ordersLoading && orderIds.length > 1) {
    return (
      <PageContainer>
        <PageLoader message="Cargando pedidos…" />
      </PageContainer>
    );
  }

  const pendingForList = orderRows ?? [];

  return (
    <PageContainer>
      {isAuthed && (
        <Link href="/me/cart" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Volver al carrito
        </Link>
      )}
      <SectionTitle>Confirmar pago</SectionTitle>
      <p className="mt-2 text-text-muted">
        {orderIds.length} pedido(s). {paid ? 'Pago confirmado.' : 'Pago pendiente.'}
      </p>

      {paid ? (
        <div className="mt-8 rounded-lg border border-accent/50 bg-accent/10 p-6">
          <h2 className="text-lg font-semibold text-accent">¡Pago confirmado!</h2>
          <p className="mt-2 text-text">Tus tickets fueron emitidos correctamente.</p>
          <Link
            href="/me/tickets"
            className="mt-6 inline-block rounded bg-accent px-6 py-3 font-medium text-bg hover:bg-accent-hover"
          >
            Ver mis tickets
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {orderIds.length > 1 ? (
            <>
              <p className="text-sm text-text-muted">
                Podés pagar evento por evento (recomendado) o usar pago demo para confirmar todos de
                una vez.
              </p>
              <PendingOrdersList
                orders={pendingForList}
                tenantId={t}
                emptyMessage="No se pudieron cargar los detalles de los pedidos."
              />
            </>
          ) : (
            <p className="text-sm text-text-muted">Confirmá el pago para recibir tus tickets.</p>
          )}

          <div className="flex flex-wrap gap-3 border-t border-border pt-6">
            <Button onClick={handlePayDemo} disabled={loading || !userId}>
              {loading
                ? 'Procesando…'
                : orderIds.length > 1
                  ? 'Pagar todo (demo)'
                  : 'Pagar (demo)'}
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? 'Verificando…' : 'Actualizar estado'}
            </Button>
            {orderIds.length === 1 && pendingForList[0] && (
              <Link
                href={`/checkout/${pendingForList[0].eventId}?tenantId=${encodeURIComponent(t)}&orderId=${encodeURIComponent(pendingForList[0].id)}`}
                className="inline-flex items-center rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10"
              >
                Ir al checkout del evento
              </Link>
            )}
          </div>
          {!userId && (
            <p className="text-sm text-amber-500">
              <Link href="/login" className="underline">
                Iniciá sesión
              </Link>{' '}
              para pagar y recibir tus tickets.
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      )}
      <Link href="/home" className="mt-8 inline-block text-sm text-text-muted hover:text-text">
        ← Volver al inicio
      </Link>
    </PageContainer>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <p className="text-text-muted">Cargando…</p>
        </PageContainer>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
