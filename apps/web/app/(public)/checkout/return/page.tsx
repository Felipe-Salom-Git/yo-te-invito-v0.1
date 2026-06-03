'use client';

import { Suspense, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  useCheckoutPaymentStatus,
  useRefreshCheckoutPaymentStatus,
  CHECKOUT_PENDING_POLL_MS,
  CHECKOUT_PENDING_POLL_MAX,
} from '@/lib/query/checkout-payment-status';
import { CheckoutPaymentDisplayPhase } from '@yo-te-invito/shared';
import { CheckoutPaymentStatusView } from '@/components/checkout/CheckoutPaymentStatusView';
import { PageContainer, SectionTitle, PageLoader, QueryError } from '@/components';
import { useTenant } from '@/hooks/useTenant';
import { getErrorMessage } from '@/lib/errors';

const DEFAULT_TENANT_ID = 'tenant-demo';

function getStoredPaymentId(orderId: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return sessionStorage.getItem(`getnet-payment:${orderId}`) ?? undefined;
}

function CheckoutReturnContent() {
  const searchParams = useSearchParams();
  const { tenantId: tenantFromHook } = useTenant();
  const tenantId = searchParams?.get('tenantId') ?? tenantFromHook ?? DEFAULT_TENANT_ID;
  const orderId = searchParams?.get('orderId')?.trim() ?? '';
  const paymentIdFromUrl = searchParams?.get('paymentId')?.trim() ?? '';
  const cancelled =
    searchParams?.get('cancelled') === '1' || searchParams?.get('cancelled') === 'true';

  const paymentId = useMemo(() => {
    if (paymentIdFromUrl) return paymentIdFromUrl;
    if (orderId) return getStoredPaymentId(orderId);
    return undefined;
  }, [paymentIdFromUrl, orderId]);

  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === 'authenticated' && !!session?.user;

  const pollCountRef = useRef(0);

  const {
    data: checkoutStatus,
    isLoading,
    isError,
    error,
    refetch,
  } = useCheckoutPaymentStatus(orderId, tenantId, {
    enabled: !!orderId,
    paymentId,
    cancelled,
  });

  const refreshMutation = useRefreshCheckoutPaymentStatus();

  useEffect(() => {
    pollCountRef.current = 0;
    if (
      !checkoutStatus ||
      checkoutStatus.displayPhase !== CheckoutPaymentDisplayPhase.PENDING ||
      !checkoutStatus.paymentId
    ) {
      return;
    }

    const sync = () => {
      if (pollCountRef.current >= CHECKOUT_PENDING_POLL_MAX) return;
      pollCountRef.current += 1;
      if (checkoutStatus.paymentProvider === 'GETNET') {
        refreshMutation.mutate({
          paymentId: checkoutStatus.paymentId!,
          tenantId,
          orderId,
        });
      } else {
        void refetch();
      }
    };

    const timer = window.setInterval(sync, CHECKOUT_PENDING_POLL_MS);
    return () => window.clearInterval(timer);
    // refreshMutation.mutate is stable; omit from deps to avoid resetting the interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    checkoutStatus?.displayPhase,
    checkoutStatus?.paymentId,
    checkoutStatus?.paymentProvider,
    orderId,
    tenantId,
  ]);

  const handleManualRefresh = () => {
    if (!checkoutStatus?.paymentId) {
      void refetch();
      return;
    }
    if (checkoutStatus.paymentProvider === 'GETNET') {
      refreshMutation.mutate({
        paymentId: checkoutStatus.paymentId,
        tenantId,
        orderId,
      });
    } else {
      void refetch();
    }
  };

  if (!orderId) {
    return (
      <PageContainer>
        <SectionTitle>Estado del pago</SectionTitle>
        <p className="mt-2 text-text-muted">Falta el identificador del pedido en el enlace.</p>
        <Link href="/home" className="mt-6 inline-block text-sm text-accent hover:underline">
          ← Volver al inicio
        </Link>
      </PageContainer>
    );
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Consultando estado del pago…" />
      </PageContainer>
    );
  }

  if (isError || !checkoutStatus) {
    return (
      <PageContainer>
        <SectionTitle>Estado del pago</SectionTitle>
        <QueryError
          message={getErrorMessage(error) ?? 'No se pudo cargar el estado'}
          onRetry={() => void refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver al inicio
      </Link>
      <SectionTitle>Estado del pago</SectionTitle>
      <p className="mt-1 text-sm text-text-muted">
        El estado se obtiene del servidor; el parámetro de la URL no es la fuente de verdad.
      </p>
      <div className="mt-8">
        <CheckoutPaymentStatusView
          status={checkoutStatus}
          tenantId={tenantId}
          isAuthenticated={isAuthenticated}
          onRefresh={
            checkoutStatus.displayPhase === CheckoutPaymentDisplayPhase.PENDING
              ? handleManualRefresh
              : undefined
          }
          isRefreshing={refreshMutation.isPending}
        />
      </div>
    </PageContainer>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <PageLoader message="Cargando…" />
        </PageContainer>
      }
    >
      <CheckoutReturnContent />
    </Suspense>
  );
}
