'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { PageContainer, SectionTitle, Button } from '@/components';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderIdsParam = searchParams?.get('orderIds') ?? searchParams?.get('orderId') ?? '';
  const orderIds = orderIdsParam ? orderIdsParam.split(',').filter(Boolean) : [];
  const { data: session } = useSession();
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId ?? 'tenant-demo';
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On load with orderIds: refresh payment status (sync from Getnet if applicable)
  useEffect(() => {
    if (orderIds.length === 0) return;
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      setError(null);
      try {
        for (const oid of orderIds) {
          const status = await repos.orders.getOrderPaymentStatus(oid, t);
          if (!cancelled && status.orderStatus === 'PAID') {
            setPaid(true);
            break;
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al verificar');
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderIds.join(','), t, repos.orders]);

  const handlePayDemo = async () => {
    if (orderIds.length === 0 || !userId) {
      setError('Debes iniciar sesión para pagar');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      for (const oid of orderIds) {
        await repos.orders.confirmDemoPayment(oid, t, userId);
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
      for (const oid of orderIds) {
        const status = await repos.orders.getOrderPaymentStatus(oid, t);
        if (status.orderStatus === 'PAID') {
          setPaid(true);
          break;
        }
      }
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

  return (
    <PageContainer>
      <SectionTitle>Confirmar pago</SectionTitle>
      <p className="mt-2 text-text-muted">
        {orderIds.length} orden(es) creada(s). {paid ? 'Pago confirmado.' : 'Pago pendiente.'}
      </p>
      {paid ? (
        <div className="mt-8 rounded-lg border border-accent/50 bg-accent/10 p-6">
          <h2 className="text-lg font-semibold text-accent">¡Pago confirmado!</h2>
          <p className="mt-2 text-text">
            Tus tickets fueron emitidos correctamente.
          </p>
          <Link
            href="/me/tickets"
            className="mt-6 inline-block rounded bg-accent px-6 py-3 font-medium text-bg hover:bg-accent-hover"
          >
            Ver mis tickets
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <Button onClick={handlePayDemo} disabled={loading}>
            {loading ? 'Procesando…' : 'Pay DEMO'}
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="ml-2">
            {refreshing ? 'Verificando…' : 'Actualizar estado'}
          </Button>
          {!userId && (
            <p className="mt-2 text-sm text-amber-500">
              Inicia sesión para poder pagar y recibir tus tickets.
            </p>
          )}
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
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
    <Suspense fallback={
      <PageContainer>
        <p className="text-text-muted">Loading…</p>
      </PageContainer>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
