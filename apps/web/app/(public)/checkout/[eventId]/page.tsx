'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { ticketsKeys } from '@/lib/query/keys';
import { useEventDetail } from '@/lib/query/events';
import { useMeAccount } from '@/lib/query/me-portal';
import { checkoutFormSchema, type CheckoutFormData } from '@/lib/schemas/checkout';
import { PageContainer, SectionTitle, Button, Input, useToast, PageLoader } from '@/components';
import { CheckoutPaymentPanel } from '@/components/checkout/CheckoutPaymentPanel';
import { getErrorMessage } from '@/lib/errors';
import { LegalFlowAcceptanceBlock } from '@/components/legal/LegalFlowAcceptanceBlock';
import { usePublicLegalRequirements } from '@/lib/query/public-legal-requirements';
import { useMyLegalRequirements, useAcceptLegalDocuments } from '@/lib/query/me-legal';
import {
  allLegalItemsSelected,
  LEGAL_ACCEPTANCE_REQUIRED_MSG,
} from '@/lib/legal/legal-acceptance-validation';
import { getReferralCode, setReferralCodeCookie } from '@/lib/referral-cookie';
import type { TicketTypeResponse } from '@/repositories/interfaces';

const DEFAULT_TENANT_ID = 'tenant-demo';

export default function CheckoutEventPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = (params?.eventId as string) ?? '';
  const tenantId = searchParams?.get('tenantId') ?? DEFAULT_TENANT_ID;
  const existingOrderId = searchParams?.get('orderId')?.trim() ?? '';
  const refFromUrl = useMemo(() => searchParams?.get('ref')?.trim() ?? '', [searchParams]);

  const { data: session, status: sessionStatus } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const isAuthenticated = sessionStatus === 'authenticated' && !!session?.user;

  const [qtyByType, setQtyByType] = useState<Record<string, number>>({});
  const [form, setForm] = useState<CheckoutFormData>({
    email: (session?.user?.email as string) ?? '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'select' | 'form' | 'pay' | 'done'>(
    existingOrderId ? 'pay' : 'select',
  );
  const [orderId, setOrderId] = useState<string | null>(existingOrderId || null);
  const [resumeTotal, setResumeTotal] = useState<string | null>(null);
  const [selectedLegalVersionIds, setSelectedLegalVersionIds] = useState<string[]>([]);
  const [legalError, setLegalError] = useState<string | null>(null);

  const { data: account } = useMeAccount(isAuthenticated);

  const { data: meCheckoutLegal, isLoading: meCheckoutLegalLoading } = useMyLegalRequirements(
    { context: 'CHECKOUT', profileType: 'USER' },
    isAuthenticated,
  );
  const { data: publicCheckoutLegal, isLoading: publicCheckoutLegalLoading } =
    usePublicLegalRequirements('CHECKOUT', 'USER', !isAuthenticated && step === 'form');
  const acceptLegal = useAcceptLegalDocuments();

  const checkoutLegalItems = isAuthenticated
    ? (meCheckoutLegal?.pending ?? [])
    : (publicCheckoutLegal?.required ?? []);
  const checkoutLegalLoading = isAuthenticated
    ? meCheckoutLegalLoading
    : publicCheckoutLegalLoading;

  useEffect(() => {
    if (refFromUrl) setReferralCodeCookie(refFromUrl);
  }, [refFromUrl]);

  useEffect(() => {
    if (account) {
      setForm((f) => ({
        ...f,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone ?? f.phone,
      }));
    }
  }, [account]);

  const { data: pendingOrder, isLoading: pendingOrderLoading } = useQuery({
    queryKey: ['checkout', 'order', existingOrderId, tenantId],
    queryFn: () => repos.orders.get(existingOrderId, tenantId),
    enabled: !!existingOrderId,
  });

  useEffect(() => {
    if (!pendingOrder) return;
    if (pendingOrder.eventId && pendingOrder.eventId !== eventId) {
      addToast('La orden no corresponde a este evento', 'error');
      return;
    }
    if (pendingOrder.status === 'PENDING_PAYMENT' || pendingOrder.status === 'pending_payment') {
      setOrderId(pendingOrder.id);
      setResumeTotal(String(pendingOrder.totalAmount ?? ''));
      setStep('pay');
    } else if (pendingOrder.status === 'PAID' || pendingOrder.status === 'paid') {
      setOrderId(pendingOrder.id);
      setStep('done');
    }
  }, [pendingOrder, eventId, addToast]);

  const { data: event, isLoading: eventLoading } = useEventDetail(eventId, tenantId);
  const { data: ticketTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['ticketTypes', eventId],
    queryFn: () => repos.events.getTicketTypes(eventId),
    enabled: !!eventId && !!event?.isTicketingEnabled && !existingOrderId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const items = Object.entries(qtyByType)
        .filter(([, q]) => q > 0)
        .map(([ttId, q]) => {
          const tt = ticketTypes!.find((t) => t.id === ttId)!;
          const price = typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price;
          return { ticketTypeId: ttId, quantity: q, unitPrice: price };
        });
      if (items.length === 0) throw new Error('Seleccioná al menos un ticket');
      return repos.orders.create({
        tenantId,
        eventId,
        buyerEmail: form.email.trim(),
        buyerName: `${form.firstName} ${form.lastName}`.trim(),
        ...(account?.id ? { buyerUserId: account.id } : {}),
        items,
        referralCode: refFromUrl || getReferralCode() || undefined,
      });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (order) => {
      setOrderId(order.id);
      setResumeTotal(String(order.totalAmount ?? ''));
      setStep('pay');
    },
  });

  const payDemoMutation = useMutation({
    mutationFn: () => repos.orders.confirmDemoPayment(orderId!, tenantId),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['mePortal'] });
      setStep('done');
    },
  });

  const payGetnetMutation = useMutation({
    mutationFn: () => repos.orders.createPayment(orderId!, tenantId, 'GETNET'),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (result) => {
      if (result.checkoutUrl && orderId) {
        try {
          sessionStorage.setItem(`getnet-payment:${orderId}`, result.paymentId);
        } catch {
          /* ignore quota / private mode */
        }
        window.location.href = result.checkoutUrl;
      } else {
        addToast('No se pudo obtener el link de pago', 'error');
      }
    },
  });

  const totalQty = Object.values(qtyByType).reduce((a, b) => a + b, 0);
  const totalCents = Object.entries(qtyByType).reduce((sum, [ttId, q]) => {
    if (q <= 0) return sum;
    const tt = ticketTypes?.find((t) => t.id === ttId);
    const price = tt ? (typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price) : 0;
    return sum + price * q;
  }, 0);

  const payTotalLabel =
    resumeTotal != null && resumeTotal !== ''
      ? `Total: $${resumeTotal}`
      : `Total: $${totalCents}`;

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = checkoutFormSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        const path = err.path[0] as string;
        if (path) errs[path] = err.message;
      });
      setErrors(errs);
      return;
    }

    setLegalError(null);
    if (
      checkoutLegalItems.length > 0 &&
      !allLegalItemsSelected(checkoutLegalItems, selectedLegalVersionIds)
    ) {
      setLegalError(LEGAL_ACCEPTANCE_REQUIRED_MSG);
      return;
    }

    if (isAuthenticated && selectedLegalVersionIds.length > 0) {
      try {
        await acceptLegal.mutateAsync({
          documentVersionIds: selectedLegalVersionIds,
          context: 'CHECKOUT',
        });
      } catch (err) {
        addToast(getErrorMessage(err), 'error');
        return;
      }
    }

    setErrors({});
    createMutation.mutate();
  };

  if (eventLoading || !eventId || (existingOrderId && pendingOrderLoading)) {
    return (
      <PageContainer>
        <PageLoader message="Cargando checkout…" />
      </PageContainer>
    );
  }

  if (!event) {
    return (
      <PageContainer>
        <p className="text-red-400">Evento no encontrado</p>
        <Link href="/home" className="mt-4 block text-accent hover:underline">
          ← Volver
        </Link>
      </PageContainer>
    );
  }

  if (!existingOrderId && (!event.isTicketingEnabled || !ticketTypes?.length)) {
    return (
      <PageContainer>
        <p className="text-text-muted">Este evento no tiene venta de entradas.</p>
        <Link
          href={`/events/${eventId}?tenantId=${tenantId}`}
          className="mt-4 block text-accent hover:underline"
        >
          ← Volver al evento
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link
        href={isAuthenticated ? '/me/cart' : `/events/${eventId}?tenantId=${tenantId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        {existingOrderId ? '← Carrito / pedidos' : '← Volver al evento'}
      </Link>
      <SectionTitle>
        {existingOrderId ? 'Completar pago' : 'Checkout'} — {event.title}
      </SectionTitle>

      {step === 'select' && !existingOrderId && (
        <>
          {isAuthenticated && (
            <p className="mt-2 text-sm text-text-muted">
              Tip: podés agregar entradas al{' '}
              <Link href="/me/cart" className="text-accent hover:underline">
                carrito en tu cuenta
              </Link>{' '}
              y pagar varios eventos juntos.
            </p>
          )}
          <div className="mt-8 space-y-4">
            <h2 className="font-semibold text-text">Seleccionar entradas</h2>
            {typesLoading ? (
              <p className="text-text-muted">Cargando…</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {ticketTypes!.map((tt: TicketTypeResponse) => (
                  <div
                    key={tt.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4"
                  >
                    <div>
                      <p className="font-medium text-text">{tt.name}</p>
                      <p className="text-accent">
                        ${typeof tt.price === 'string' ? tt.price : tt.price}
                      </p>
                      <p className="text-xs text-text-muted">
                        {tt.capacityAvailable} disponibles
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={Math.min(10, tt.capacityAvailable)}
                      value={qtyByType[tt.id] ?? 0}
                      onChange={(e) =>
                        setQtyByType((p) => ({
                          ...p,
                          [tt.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                        }))
                      }
                      className="w-20 rounded border border-border bg-bg px-2 py-1 text-text"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 flex items-center justify-between">
            <p className="font-semibold text-text">
              Total: ${totalCents} ({totalQty} entradas)
            </p>
            <Button onClick={() => totalQty > 0 && setStep('form')} disabled={totalQty < 1}>
              Continuar
            </Button>
          </div>
        </>
      )}

      {step === 'form' && !existingOrderId && (
        <form
          onSubmit={handleSubmitForm}
          className="mt-8 space-y-4 rounded-xl border border-border bg-bg-muted p-4 sm:p-6"
          aria-label="Datos del comprador"
        >
          <h2 className="font-semibold text-text">Datos del comprador</h2>
          {isAuthenticated && (
            <p className="text-xs text-text-muted">
              Datos tomados de tu cuenta. Podés editarlos antes de crear la orden.
            </p>
          )}
          <Input
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            error={errors.email}
            required
          />
          <Input
            label="Nombre"
            name="firstName"
            value={form.firstName}
            onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
            error={errors.firstName}
            required
          />
          <Input
            label="Apellido"
            name="lastName"
            value={form.lastName}
            onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
            error={errors.lastName}
            required
          />
          <Input
            label="Teléfono (opcional)"
            name="phone"
            value={form.phone ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          {(checkoutLegalItems.length > 0 || checkoutLegalLoading) && (
            <LegalFlowAcceptanceBlock
              items={checkoutLegalItems}
              selectedVersionIds={selectedLegalVersionIds}
              onChange={setSelectedLegalVersionIds}
              disabled={createMutation.isPending || acceptLegal.isPending}
              loading={checkoutLegalLoading}
              error={legalError}
              guestMode={!isAuthenticated}
            />
          )}
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => setStep('select')}>
              Atrás
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending || acceptLegal.isPending || checkoutLegalLoading
              }
            >
              {createMutation.isPending ? 'Creando…' : 'Crear orden'}
            </Button>
          </div>
        </form>
      )}

      {step === 'pay' && orderId && (
        <CheckoutPaymentPanel
          orderId={orderId}
          totalLabel={payTotalLabel}
          tenantId={tenantId}
          onPayDemo={() => payDemoMutation.mutate()}
          onPayGetnet={() => payGetnetMutation.mutate()}
          demoPending={payDemoMutation.isPending}
          getnetPending={payGetnetMutation.isPending}
          error={payDemoMutation.error ?? payGetnetMutation.error}
          backHref={isAuthenticated ? '/me/cart' : `/events/${eventId}?tenantId=${tenantId}`}
          backLabel={isAuthenticated ? '← Volver al carrito' : '← Volver al evento'}
        />
      )}

      {step === 'done' && (
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
      )}
    </PageContainer>
  );
}
