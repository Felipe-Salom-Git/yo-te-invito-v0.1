'use client';

import { useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useEventDetail } from '@/lib/query/events';
import { checkoutFormSchema, type CheckoutFormData } from '@/lib/schemas/checkout';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { getReferralCode } from '@/lib/referral-cookie';
import type { TicketTypeResponse } from '@/repositories/interfaces';

const DEFAULT_TENANT_ID = 'tenant-demo';

export default function CheckoutEventPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = (params?.eventId as string) ?? '';
  const tenantId = searchParams?.get('tenantId') ?? DEFAULT_TENANT_ID;

  const { data: session } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? 'guest-demo';

  const [qtyByType, setQtyByType] = useState<Record<string, number>>({});
  const [form, setForm] = useState<CheckoutFormData>({
    email: (session?.user?.email as string) ?? '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'select' | 'form' | 'pay' | 'done'>('select');
  const [orderId, setOrderId] = useState<string | null>(null);

  const { data: event, isLoading: eventLoading } = useEventDetail(eventId, tenantId);
  const { data: ticketTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['ticketTypes', eventId],
    queryFn: () => repos.events.getTicketTypes(eventId),
    enabled: !!eventId && !!event?.isTicketingEnabled,
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
      if (items.length === 0) throw new Error('Selecciona al menos un ticket');
      return repos.orders.create({
        tenantId,
        eventId,
        buyerEmail: form.email,
        buyerName: `${form.firstName} ${form.lastName}`,
        buyerUserId: userId !== 'guest-demo' ? userId : undefined,
        items,
        referralCode: getReferralCode(),
      });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (order) => {
      setOrderId(order.id);
      setStep('pay');
    },
  });

  const payMutation = useMutation({
    mutationFn: () => repos.orders.confirmDemoPayment(orderId!, tenantId, userId),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'me', userId] });
      setStep('done');
    },
  });

  const totalQty = Object.values(qtyByType).reduce((a, b) => a + b, 0);
  const totalCents = Object.entries(qtyByType).reduce((sum, [ttId, q]) => {
    if (q <= 0) return sum;
    const tt = ticketTypes?.find((t) => t.id === ttId);
    const price = tt ? (typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price) : 0;
    return sum + price * q;
  }, 0);

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = checkoutFormSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.errors.forEach((e) => {
        const path = e.path[0] as string;
        if (path) errs[path] = e.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    createMutation.mutate();
  };

  if (eventLoading || !eventId) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
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

  if (!event.isTicketingEnabled || !ticketTypes?.length) {
    return (
      <PageContainer>
        <p className="text-text-muted">Este evento no tiene venta de entradas.</p>
        <Link href={`/events/${eventId}?tenantId=${tenantId}`} className="mt-4 block text-accent hover:underline">
          ← Volver al evento
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href={`/events/${eventId}?tenantId=${tenantId}`} className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver al evento
      </Link>
      <SectionTitle>Checkout — {event.title}</SectionTitle>

      {step === 'select' && (
        <>
          <div className="mt-8 space-y-4">
            <h2 className="font-semibold text-text">Seleccionar entradas</h2>
            {typesLoading ? (
              <p className="text-text-muted">Cargando…</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {ticketTypes.map((tt: TicketTypeResponse) => (
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
            <Button
              onClick={() => totalQty > 0 && setStep('form')}
              disabled={totalQty < 1}
            >
              Continuar
            </Button>
          </div>
        </>
      )}

      {step === 'form' && (
        <form onSubmit={handleSubmitForm} className="mt-8 space-y-4 rounded-xl border border-border bg-bg-muted p-4 sm:p-6" role="form" aria-label="Datos del comprador">
          <h2 className="font-semibold text-text">Datos del comprador</h2>
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
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => setStep('select')}>
              Atrás
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creando…' : 'Crear orden'}
            </Button>
          </div>
        </form>
      )}

      {step === 'pay' && orderId && (
        <div className="mt-8 rounded-xl border border-border bg-bg-muted p-6">
          <h2 className="font-semibold text-text">Simular pago</h2>
          <p className="mt-2 text-text-muted">
            Orden {orderId} — Total: ${totalCents}
          </p>
          <Button
            onClick={() => payMutation.mutate()}
            disabled={payMutation.isPending}
            className="mt-4"
          >
            {payMutation.isPending ? 'Procesando…' : 'Pagar (demo)'}
          </Button>
          {payMutation.error && (
            <p className="mt-2 text-sm text-red-400">
              {payMutation.error instanceof Error ? payMutation.error.message : 'Error'}
            </p>
          )}
        </div>
      )}

      {step === 'done' && (
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
      )}
    </PageContainer>
  );
}
